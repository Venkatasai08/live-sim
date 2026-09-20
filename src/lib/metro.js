/**
 * ============================================================================
 * live-sim Local Metro Bundler Controller (metro.js)
 * ============================================================================
 * Manages the local Expo development server with high-speed tunneling.
 * - Primary: Cloudflare Quick Tunnel (zero rate-limits, instant startup, free)
 * - Fallback: Expo ngrok Tunnel (`npx expo start --tunnel`)
 * 
 * Automatically captures the public `exp://` tunnel URL and coordinates Fast
 * Refresh updates between the local Windows machine and the cloud iOS Simulator.
 * ============================================================================
 */

import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sleep, sh } from './proc.js';
import { dim, cyan, ok, err, info, step } from './ui.js';

const IS_WIN = process.platform === 'win32';

/**
 * Locate the `cloudflared` binary on Windows or Unix.
 * Checks system PATH and standard installation paths.
 * 
 * @returns {string|null} Path to cloudflared executable or null
 */
export function findCloudflaredBinary() {
  // 1. Check if 'cloudflared' is executable directly in PATH
  const check = spawnSync(IS_WIN ? 'where.exe' : 'which', ['cloudflared'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (check.status === 0 && check.stdout) {
    const firstLine = check.stdout.trim().split(/\r?\n/)[0];
    if (firstLine && existsSync(firstLine)) return firstLine;
  }

  // 2. Check standard Windows install locations
  if (IS_WIN) {
    const candidatePaths = [
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
      join(process.env.LOCALAPPDATA || '', 'Programs', 'cloudflared', 'cloudflared.exe'),
    ];
    for (const p of candidatePaths) {
      if (existsSync(p)) return p;
    }
  }

  return null;
}

/**
 * Validate that the target directory is an Expo / React Native project.
 * 
 * @param {string} cwd - Target directory
 * @returns {{ name: string, version: string, isExpo: boolean }}
 */
export function assertExpoProject(cwd) {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${cwd}. Run live-sim from your project root.`);
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const isExpo = Boolean(pkg.dependencies?.expo || pkg.devDependencies?.expo);
    const isRN = Boolean(pkg.dependencies?.['react-native'] || pkg.devDependencies?.['react-native']);

    if (!isExpo && !isRN) {
      throw new Error(`Project at ${cwd} does not have 'expo' or 'react-native' listed in package.json.`);
    }

    return {
      name: pkg.name || 'expo-app',
      version: pkg.version || '1.0.0',
      isExpo,
    };
  } catch (e) {
    throw new Error(`Failed to parse package.json: ${e.message}`);
  }
}

/**
 * Terminate any stale process currently listening on the specified port.
 * 
 * @param {number} port - Port number (default: 8081)
 */
export function freePort(port = 8081) {
  if (IS_WIN) {
    try {
      const netstat = sh('cmd.exe', ['/c', `netstat -ano | findstr :${port}`]);
      if (netstat.ok && netstat.out) {
        const lines = netstat.out.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0') {
            sh('cmd.exe', ['/c', `taskkill /f /pid ${pid}`]);
          }
        }
      }
    } catch {}
  }
}

/** Strip ANSI color/terminal escape codes from text */
function stripAnsi(str) {
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .trim();
}

/**
 * Start an outbound Cloudflare Quick Tunnel forwarding to local port.
 * 
 * @param {number} port - Local port to forward
 * @param {number} timeoutMs - Max wait time in ms
 * @returns {Promise<{ process: ChildProcess, url: string, hostname: string }>}
 */
export function startCloudflareTunnel(port = 8081, timeoutMs = 30000) {
  const binary = findCloudflaredBinary() || 'cloudflared';

  return new Promise((resolve, reject) => {
    let resolved = false;
    let rawOutput = '';

    const args = ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`];
    const child = spawn(binary, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { child.kill(); } catch {}
        reject(new Error(`Timed out waiting for Cloudflare tunnel URL.\n${rawOutput}`));
      }
    }, timeoutMs);

    function onData(buf) {
      const text = buf.toString();
      rawOutput += text;

      // Extract *.trycloudflare.com URL from cloudflared logs
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        const url = match[0];
        const hostname = url.replace(/^https?:\/\//, '');
        resolve({
          process: child,
          url,
          hostname,
        });
      }
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Cloudflare tunnel exited with code ${code}.\n${rawOutput}`));
      }
    });
  });
}

/**
 * Query local Metro server manifest on port 8081 to extract the hostUri / tunnel URL.
 * 
 * @param {number} port - Metro port
 * @returns {Promise<string|null>} exp:// URI or null
 */
function fetchManifestTunnel(port = 8081) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: '/',
      method: 'GET',
      headers: {
        'accept': 'application/expo+json, application/json, */*',
        'expo-platform': 'ios',
      },
      timeout: 2000,
    };

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const hostUri = json.extra?.expoClient?.hostUri ||
                          json.expoClient?.hostUri ||
                          json.hostUri ||
                          json.extra?.expoGo?.debuggerHost ||
                          json.expoGo?.debuggerHost;
          if (hostUri) {
            resolve(`exp://${hostUri}`);
            return;
          }
        } catch {}
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

/**
 * Start the local Expo Metro server with tunnel support.
 * Prioritizes Cloudflare Tunnel for rock-solid stability and zero rate-limits.
 * 
 * @param {string} cwd - Project root directory
 * @param {object} options - Options
 * @returns {Promise<{ process: ChildProcess, cloudflareProcess?: ChildProcess, tunnelUrl: string, kill: () => void }>}
 */
export async function startMetroTunnel(cwd, { timeoutMs = 180000 } = {}) {
  // Free port 8081 if previously occupied
  freePort(8081);

  const cfBinary = findCloudflaredBinary();

  // Mode 1: Cloudflare Quick Tunnel + Metro (Recommended)
  if (cfBinary) {
    try {
      // Step A: Start Cloudflare Tunnel on port 8081
      const cf = await startCloudflareTunnel(8081, 30000);
      const tunnelUrl = `exps://${cf.hostname}`;

      // Step B: Start Metro bundler pointing to the Cloudflare tunnel hostname
      const metroEnv = {
        ...process.env,
        REACT_NATIVE_PACKAGER_HOSTNAME: cf.hostname,
        EXPO_PACKAGER_PROXY_URL: cf.url,
      };
      delete metroEnv.CI;

      const cmd = IS_WIN ? 'cmd.exe' : 'npx';
      const args = IS_WIN
        ? ['/d', '/s', '/c', 'npx', 'expo', 'start', '--port', '8081']
        : ['expo', 'start', '--port', '8081'];

      const metroChild = spawn(cmd, args, {
        cwd,
        env: metroEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      // Handle interactive prompts automatically if any arise
      metroChild.stdout.on('data', (d) => {
        const text = d.toString();
        if (/use port/i.test(text) || /is being used/i.test(text)) {
          try { metroChild.stdin.write('y\n'); } catch {}
        }
      });

      const kill = () => {
        try { metroChild.kill(); } catch {}
        try { cf.process.kill(); } catch {}
        freePort(8081);
      };

      return {
        process: metroChild,
        cloudflareProcess: cf.process,
        tunnelUrl,
        kill,
      };
    } catch (cfErr) {
      info(`Cloudflare tunnel startup notice: ${cfErr.message}. Falling back to standard tunnel.`);
    }
  }

  // Mode 2: Standard Expo ngrok Tunnel (`npx expo start --tunnel`)
  return new Promise((resolve, reject) => {
    let resolved = false;
    let rawOutput = '';
    let pollInterval = null;

    const cmd = IS_WIN ? 'cmd.exe' : 'npx';
    const args = IS_WIN
      ? ['/d', '/s', '/c', 'npx', 'expo', 'start', '--tunnel']
      : ['expo', 'start', '--tunnel'];

    const metroEnv = { ...process.env };
    delete metroEnv.CI;

    const child = spawn(cmd, args, {
      cwd,
      env: metroEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const kill = () => {
      try { child.kill(); } catch {}
      freePort(8081);
    };

    function finishSuccess(url) {
      if (!resolved && url) {
        resolved = true;
        clearTimeout(timeout);
        if (pollInterval) clearInterval(pollInterval);
        resolve({ process: child, tunnelUrl: url, kill });
      }
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (pollInterval) clearInterval(pollInterval);
        reject(new Error(`Timed out waiting for Expo tunnel URL (${timeoutMs / 1000}s).\nOutput received so far:\n${rawOutput}`));
      }
    }, timeoutMs);

    // Poll local Metro manifest API every 1 second
    pollInterval = setInterval(async () => {
      if (resolved) return;
      const url = await fetchManifestTunnel(8081);
      if (url) {
        finishSuccess(url);
      }
    }, 1000);

    function onData(chunk) {
      const text = chunk.toString();
      rawOutput += text;

      // Automatically answer 'y' to prompts
      if (/would you like to install/i.test(text) || /\[Y\/n\]/i.test(text) || /use port/i.test(text)) {
        try { child.stdin.write('y\n'); } catch {}
      }

      const clean = stripAnsi(rawOutput);

      // Match hostUri or debuggerHost or direct tunnel domains (strictly excluding status.ngrok.com)
      const hostMatch = clean.match(/"hostUri"\s*:\s*"([^"]+)"/i) ||
                        clean.match(/"debuggerHost"\s*:\s*"([^"]+)"/i) ||
                        clean.match(/([a-z0-9-]+-8081\.exp\.direct)/i) ||
                        clean.match(/(https?:\/\/[a-z0-9-.]+\.exp\.direct[^\s\r\n\t'"`)]*)/i) ||
                        clean.match(/(https?:\/\/(?!status)[a-z0-9-.]+\.ngrok[^\s\r\n\t'"`)]*)/i);

      if (hostMatch) {
        let target = hostMatch[1] || hostMatch[0];
        if (!target.includes('status.ngrok.com')) {
          if (!target.startsWith('exp://')) {
            if (target.startsWith('http://') || target.startsWith('https://')) {
              target = target.replace(/^https?:\/\//, 'exp://');
            } else {
              target = `exp://${target}`;
            }
          }
          finishSuccess(target);
        }
      }
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (pollInterval) clearInterval(pollInterval);
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (pollInterval) clearInterval(pollInterval);
        reject(new Error(`Expo process exited prematurely with code ${code}.\n${rawOutput}`));
      }
    });
  });
}
