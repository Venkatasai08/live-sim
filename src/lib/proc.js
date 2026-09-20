/**
 * ============================================================================
 * live-sim Cross-Platform Process Runner (proc.js)
 * ============================================================================
 * Handles spawning child processes across Windows (PowerShell/CMD), macOS, and Linux
 * without deprecation warnings or shell-escaping vulnerabilities.
 * ============================================================================
 */

import { spawnSync, spawn } from 'node:child_process';

const IS_WIN = process.platform === 'win32';

/**
 * Execute a command synchronously and capture stdout/stderr safely.
 * Never throws an uncaught exception.
 *
 * @param {string} cmd - Command or executable binary
 * @param {string[]} args - Argument list
 * @param {object} opts - ChildProcess options
 * @returns {{ ok: boolean, code: number, out: string, err: string }}
 */
export function sh(cmd, args = [], opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    windowsHide: true,
    ...opts,
  });

  // Windows fallback for batch / cmd scripts (.cmd / .bat)
  if (r.error && IS_WIN && r.error.code === 'ENOENT') {
    const cmdStr = [cmd, ...args.map((a) => (a.includes(' ') ? `"${a}"` : a))].join(' ');
    const fallback = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdStr], {
      encoding: 'utf8',
      windowsHide: true,
      ...opts,
    });
    return {
      ok: fallback.status === 0,
      code: fallback.status ?? (fallback.error ? 1 : 0),
      out: (fallback.stdout ?? '').trim(),
      err: (fallback.stderr ?? (fallback.error ? fallback.error.message : '')).trim(),
    };
  }

  return {
    ok: r.status === 0,
    code: r.status ?? (r.error ? 1 : 0),
    out: (r.stdout ?? '').trim(),
    err: (r.stderr ?? (r.error ? r.error.message : '')).trim(),
  };
}

/**
 * Execute a command synchronously and throw an Error on non-zero exit.
 *
 * @param {string} cmd - Command
 * @param {string[]} args - Arguments
 * @param {object} opts - ChildProcess options
 */
export function shx(cmd, args = [], opts = {}) {
  const r = sh(cmd, args, opts);
  if (!r.ok) {
    const err = new Error(r.err || r.out || `Command execution failed: ${cmd} ${args.join(' ')}`);
    err.code = r.code;
    err.stdout = r.out;
    err.stderr = r.err;
    throw err;
  }
  return r;
}

/**
 * Check if a command or binary is available on the system PATH.
 *
 * @param {string} cmd - Name of binary (e.g. 'gh', 'git', 'node')
 * @returns {boolean}
 */
export function has(cmd) {
  if (IS_WIN) {
    return sh('where.exe', [cmd]).ok || sh('which', [cmd]).ok;
  }
  return sh('which', [cmd]).ok;
}

/**
 * Open a URL in the user's default web browser cross-platform.
 *
 * @param {string} url - Target URL to open
 */
export function open(url) {
  if (IS_WIN) {
    const p = spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
    p.on('error', () => {});
    p.unref();
  } else if (process.platform === 'darwin') {
    const p = spawn('open', [url], { detached: true, stdio: 'ignore' });
    p.on('error', () => {});
    p.unref();
  } else {
    const p = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    p.on('error', () => {});
    p.unref();
  }
}

/**
 * Asynchronous sleep delay helper.
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
