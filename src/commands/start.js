/**
 * ============================================================================
 * live-sim Start Command (start.js)
 * ============================================================================
 * Main entrypoint for zero-push live development:
 * 1. Launches local Expo Metro bundler with a secure tunnel.
 * 2. Automatically starts a remote Apple Silicon iOS Simulator on GitHub Actions.
 * 3. Connects the remote simulator directly to your local PC via `xcrun simctl openurl`.
 * 4. Streams the live simulator to your browser with sub-second Fast Refresh.
 * ============================================================================
 */

import { randomBytes } from 'node:crypto';
import * as git from '../lib/git.js';
import * as gh from '../lib/gh.js';
import { sleep, open as openUrl } from '../lib/proc.js';
import { assertExpoProject, startMetroTunnel } from '../lib/metro.js';
import { scaffold } from './init.js';
import { saveSession } from '../lib/session.js';
import { info, ok, warn, step, createSpinner, bold, dim, cyan, green } from '../lib/ui.js';

const WORKFLOW = 'live-sim.yml';

export async function start(cwd, flags = {}) {
  assertExpoProject(cwd);
  gh.requireAuth();

  step('Preparing live development session');

  // Ensure git repository is initialized
  if (!git.isRepo(cwd)) {
    git.init(cwd);
    ok('Initialized git repository');
  }

  const branch = git.currentBranch(cwd);

  // Commit initial project files if needed
  if (git.isDirty(cwd) || !git.hasCommits(cwd)) {
    git.commitAll(cwd, `live-sim init: ${new Date().toISOString()}`);
    ok(`Committed on branch ${bold(branch)}`);
  }

  // Ensure GitHub remote exists
  let repo = gh.nameWithOwner(cwd);
  if (!repo) {
    const defaultName = 'live-sim-app';
    const isPublic = flags.public !== false; // public for free unlimited GitHub Actions minutes
    step(`Creating ${isPublic ? 'public' : 'private'} GitHub repository ${bold(defaultName)}`);
    repo = gh.createRepo(cwd, defaultName, { isPublic, branch });
    ok(`Created remote repository ${bold(repo)}`);
  } else {
    git.push(cwd, branch);
  }

  // Scaffold workflow files if missing
  if (scaffold(cwd) || git.isDirty(cwd)) {
    git.commitAll(cwd, 'live-sim: add live simulator streaming workflow');
    git.push(cwd, branch);
    ok('Pushed live-sim workflow template');
  }

  // Step 1: Start local Metro bundler with tunnel
  let metroProc = null;
  let metroKill = null;
  let tunnelUrl = flags['tunnel-url'] || flags.url || '';

  if (tunnelUrl) {
    ok(`Using provided tunnel URL: ${cyan(tunnelUrl)}`);
  } else {
    const metroSpinner = createSpinner('Starting local Metro bundler with high-speed tunnel...');
    metroSpinner.start();

    try {
      const metroRes = await startMetroTunnel(cwd, { timeoutMs: 180000 });
      metroProc = metroRes.process;
      metroKill = metroRes.kill;
      tunnelUrl = metroRes.tunnelUrl;
      metroSpinner.stop(`Local Metro tunnel active: ${cyan(tunnelUrl)}`);
    } catch (err) {
      metroSpinner.stop(`Failed to start local Metro tunnel: ${err.message}`, false);
      return;
    }
  }

  // Step 2: Dispatch GitHub Actions cloud simulator runner
  const sha = git.headSha(cwd);
  const session = randomBytes(4).toString('hex');
  const token = randomBytes(16).toString('hex');
  const context = `live-sim/${session}`;
  const minutes = String(flags.minutes ?? '60');
  const device = flags.device ?? 'iPhone 16 Pro';

  step(`Launching cloud iOS Simulator runner ${dim(`(session: ${session})`)}`);

  const inputs = {
    session,
    gate_token: token,
    local_tunnel_url: tunnelUrl,
    minutes,
    device,
    runner: flags.runner ?? 'macos-15',
    max_dimension: String(flags['max-dimension'] ?? '900'),
    video_fps: String(flags.fps ?? '30'),
    video_quality: String(flags.quality ?? '0.7'),
  };

  await gh.dispatch(cwd, WORKFLOW, branch, inputs);
  ok('Dispatched simulator runner on Apple Silicon macOS image');

  // Find recent run ID
  await sleep(3000);
  const recentRuns = gh.getRecentRuns(cwd, WORKFLOW, branch);
  const runId = recentRuns[0]?.id;

  if (runId) {
    info(`Workflow logs: ${dim(`https://github.com/${repo}/actions/runs/${runId}`)}`);
  }

  saveSession(cwd, {
    sessionId: session,
    token,
    repo,
    sha,
    context,
    runId,
    branch,
    device,
    minutes: Number(minutes),
    startedAt: Date.now(),
    tunnelUrl,
    metroPid: metroProc?.pid || null,
  });

  // Step 3: Wait for Cloudflare tunnel stream URL
  const simSpinner = createSpinner('Waiting for iOS Simulator to boot and connect to your local Metro server...');
  simSpinner.start();

  let streamUrl = null;
  const maxAttempts = 120; // 10 minutes polling
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const st = gh.readStatus(cwd, repo, sha, context);
    if (st && st.target_url) {
      streamUrl = `${st.target_url}/?k=${token}`;
      break;
    }

    if (runId) {
      const run = gh.getRun(cwd, runId);
      if (run?.status === 'completed' && run.conclusion !== 'success') {
        simSpinner.stop(`Workflow run ${run.conclusion}! Check logs: https://github.com/${repo}/actions/runs/${runId}`, false);
        if (typeof metroKill === 'function') metroKill();
        return;
      }
    }
  }

  if (!streamUrl) {
    simSpinner.stop('Timed out waiting for simulator stream URL. Check GitHub Actions logs.', false);
    if (typeof metroKill === 'function') metroKill();
    return;
  }

  simSpinner.stop(`iOS Simulator is live and connected to your PC!`);

  console.log('\n' + bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`  📱 ${bold(green('iOS Simulator Live Stream (Zero-Push Mode)'))}`);
  console.log(`  🔗 Stream URL:   ${cyan(bold(streamUrl))}`);
  console.log(`  ⚡ Local Server: ${dim(tunnelUrl)}`);
  console.log(`  ⏱️  Session:      Active for ${bold(minutes)} minutes with Fast Refresh (<1s)`);
  console.log(bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`${dim('Edit any code file in your project and save — changes will update instantly on the simulator!')}`);
  console.log(`${dim('Press Ctrl + C in this terminal to end the live session.')}\n`);

  saveSession(cwd, {
    sessionId: session,
    token,
    repo,
    sha,
    context,
    runId,
    branch,
    device,
    minutes: Number(minutes),
    startedAt: Date.now(),
    tunnelUrl,
    streamUrl,
    metroPid: metroProc?.pid || null,
  });

  // Automatically open stream in user's default browser
  if (flags.open !== false && !flags['no-open']) {
    info('Opening live iOS Simulator in your browser...');
    await sleep(1500);
    openUrl(streamUrl);
  }

  console.log(`${dim('💡 Tip: If your browser displays "site cannot be reached" initially, wait 3-5s and refresh the page.')}\n`);

  // Forward live Metro bundling logs to user terminal
  if (metroProc?.stdout) {
    metroProc.stdout.on('data', (data) => {
      const msg = data.toString();
      if (/bundle|compil|reload|refresh|error|warn|syntax|fail|ready/i.test(msg)) {
        process.stdout.write(dim(`[Metro] ${msg}`));
      }
    });
  }

  // Keep terminal active until the developer presses Ctrl+C
  await new Promise((resolve) => {
    const handleExit = () => {
      console.log('\nStopping live development session...');
      if (typeof metroKill === 'function') {
        metroKill();
      } else if (metroProc) {
        try { metroProc.kill('SIGINT'); } catch {}
      }
      resolve();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  });
}
