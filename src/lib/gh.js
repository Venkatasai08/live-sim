/**
 * ============================================================================
 * live-sim GitHub CLI & Actions Integration (gh.js)
 * ============================================================================
 * Interfaces with the GitHub CLI (gh) and GitHub REST API to manage remote
 * workflows, read live commit statuses, and discover cloud simulator URLs.
 * ============================================================================
 */

import { sh, shx, has, sleep } from './proc.js';

/** Verify that GitHub CLI is installed and authenticated */
export function requireAuth() {
  if (!has('gh')) {
    throw new Error('GitHub CLI (gh) not found. Install it on Windows: winget install GitHub.cli');
  }
  const r = sh('gh', ['auth', 'status']);
  if (!r.ok) {
    throw new Error('Not logged in to GitHub. Please run: gh auth login');
  }
}

/** Execute a GitHub API query returning parsed JSON or null */
export function api(path, extra = []) {
  const r = sh('gh', ['api', path, ...extra]);
  if (!r.ok) return null;
  try {
    return JSON.parse(r.out);
  } catch {
    return null;
  }
}

/** Get the `owner/repo` string for the current directory repository */
export function nameWithOwner(cwd) {
  const r = sh('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { cwd });
  return r.ok && r.out ? r.out : null;
}

/** Create a new GitHub repository for hosting the workflow runner */
export function createRepo(cwd, name, { isPublic = true, branch = 'main' } = {}) {
  const args = [
    'repo',
    'create',
    name,
    isPublic ? '--public' : '--private',
    '--source=.',
    '--remote=origin',
    '--push',
  ];
  shx('gh', args, { cwd });
  sh('git', ['branch', '--set-upstream-to', `origin/${branch}`, branch], { cwd });
  return nameWithOwner(cwd);
}

/** Check if current repository is public */
export function isPublicRepo(cwd) {
  const r = sh('gh', ['repo', 'view', '--json', 'visibility', '-q', '.visibility'], { cwd });
  return r.ok && r.out.toUpperCase() === 'PUBLIC';
}

/**
 * Dispatch GitHub Actions workflow with automatic retries for background indexing.
 */
export async function dispatch(cwd, workflow, ref, inputs = {}, { attempts = 15 } = {}) {
  const args = ['workflow', 'run', workflow, '--ref', ref];
  for (const [k, v] of Object.entries(inputs)) {
    if (v !== undefined && v !== null && v !== '') {
      args.push('-f', `${k}=${v}`);
    }
  }

  let last = '';
  for (let i = 0; i < attempts; i++) {
    const r = sh('gh', args, { cwd });
    if (r.ok) return;

    last = r.err || r.out;

    // Retry while GitHub indexes workflow YAML in the background
    const isIndexing = /could not find|not found|404|422|workflow_dispatch|does not exist|disabled|dispatchevent/i.test(last);
    if (!isIndexing && i > 0) {
      break;
    }

    await sleep(4000);
  }

  throw new Error(`Could not dispatch workflow '${workflow}': ${last}`);
}

/** Fetch recent runs of the workflow */
export function getRecentRuns(cwd, workflow, branch) {
  const res = api(`repos/:owner/:repo/actions/workflows/${workflow}/runs?branch=${branch}&per_page=5`);
  return res?.workflow_runs || [];
}

/** Read commit status for discovering live stream URLs */
export function readStatus(cwd, repo, sha, context) {
  if (!repo || !sha) return null;
  const statuses = api(`repos/${repo}/commits/${sha}/statuses`);
  if (!Array.isArray(statuses)) return null;
  return statuses.find((s) => s.context === context) || null;
}

/** Fetch workflow run details */
export function getRun(cwd, runId) {
  if (!runId) return null;
  return api(`repos/:owner/:repo/actions/runs/${runId}`);
}

/** Cancel a running GitHub Actions run */
export function cancelRun(cwd, runId) {
  if (!runId) return false;
  return sh('gh', ['run', 'cancel', String(runId)], { cwd }).ok;
}
