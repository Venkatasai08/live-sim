/**
 * ============================================================================
 * live-sim Down Command (down.js)
 * ============================================================================
 * Gracefully terminates the remote cloud runner on GitHub Actions, kills any
 * background Metro PID, and clears the local session state.
 * ============================================================================
 */

import * as gh from '../lib/gh.js';
import { loadSession, clearSession } from '../lib/session.js';
import { ok, info, warn, bold } from '../lib/ui.js';

export async function down(cwd) {
  const session = loadSession(cwd);
  if (!session) {
    info('No active live-sim session found to terminate.');
    return;
  }

  // Cancel remote GitHub Actions runner
  if (session.runId) {
    info(`Cancelling GitHub Actions runner ${bold(session.runId)}...`);
    const cancelled = gh.cancelRun(cwd, session.runId);
    if (cancelled) {
      ok(`Remote runner terminated successfully.`);
    } else {
      warn(`Could not cancel runner ${session.runId} (it may have already stopped).`);
    }
  }

  // Kill local Metro process if PID is stored
  if (session.metroPid) {
    try {
      process.kill(session.metroPid, 'SIGTERM');
      ok('Terminated local Metro process.');
    } catch {}
  }

  clearSession(cwd);
  ok('Local live-sim session cleared.');
}
