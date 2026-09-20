/**
 * ============================================================================
 * live-sim Status Command (status.js)
 * ============================================================================
 * Displays information regarding the current active live-sim session,
 * runner health, stream URL, and local Metro tunnel state.
 * ============================================================================
 */

import * as gh from '../lib/gh.js';
import { loadSession } from '../lib/session.js';
import { info, bold, cyan, green, red, dim } from '../lib/ui.js';

export async function status(cwd) {
  const session = loadSession(cwd);
  if (!session) {
    info('No active live-sim session found for this project.');
    return;
  }

  const age = Math.round((Date.now() - session.startedAt) / 60000);
  const run = session.runId ? gh.getRun(cwd, session.runId) : null;
  const commitStatus = gh.readStatus(cwd, session.repo, session.sha, session.context);

  console.log(`\n${bold('live-sim Active Session Status')}\n`);
  console.log(`  Session ID:     ${bold(session.sessionId)}`);
  console.log(`  Target Device:  ${session.device || 'iPhone 16 Pro'}`);
  console.log(`  Uptime:         ${age} minute(s) (Duration: ${session.minutes}m)`);
  console.log(`  Local Metro:    ${session.tunnelUrl ? cyan(session.tunnelUrl) : dim('not recorded')}`);

  if (run) {
    const state = run.status === 'completed'
      ? (run.conclusion === 'success' ? green('completed') : red(run.conclusion))
      : cyan(run.status);
    console.log(`  Runner State:   ${state} ${dim(`(Run ID: ${session.runId})`)}`);
    console.log(`  GitHub Logs:    ${dim(run.html_url)}`);
  }

  if (session.streamUrl || commitStatus?.target_url) {
    const url = session.streamUrl || `${commitStatus.target_url}/?k=${session.token}`;
    console.log(`\n  ${green('●')} Stream URL:     ${cyan(bold(url))}`);
  } else {
    console.log(`\n  ${dim('●')} Stream URL:     ${dim('Not active / stopped')}`);
  }
  console.log('');
}
