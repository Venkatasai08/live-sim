/**
 * ============================================================================
 * live-sim Git Helper (git.js)
 * ============================================================================
 * Handles local git status checks, branch detection, and repository scaffolding.
 * ============================================================================
 */

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { sh, shx } from './proc.js';

export const LIVE_SIM_GITIGNORE = [
  '.live-sim',
  '*.log',
  'node_modules/',
  '.expo/',
];

/** Check if current directory is a git repository */
export function isRepo(cwd) {
  return existsSync(join(cwd, '.git'));
}

/** Initialize a new git repository */
export function init(cwd) {
  shx('git', ['init'], { cwd });
}

/** Get the currently active branch name (defaults to 'main') */
export function currentBranch(cwd) {
  const r = sh('git', ['branch', '--show-current'], { cwd });
  if (r.ok && r.out) return r.out;
  const rev = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  return rev.ok && rev.out !== 'HEAD' ? rev.out : 'main';
}

/** Check if the repository has at least one commit */
export function hasCommits(cwd) {
  return sh('git', ['rev-parse', 'HEAD'], { cwd }).ok;
}

/** Check if working tree has uncommitted modifications */
export function isDirty(cwd) {
  const r = sh('git', ['status', '--porcelain'], { cwd });
  return r.ok && r.out.length > 0;
}

/** Stage all files and create a commit */
export function commitAll(cwd, message) {
  shx('git', ['add', '-A'], { cwd });
  shx('git', ['commit', '-m', message], { cwd });
}

/** Push branch to remote origin */
export function push(cwd, branch = 'main') {
  shx('git', ['push', '-u', 'origin', branch], { cwd });
}

/** Get the latest commit SHA hash */
export function headSha(cwd) {
  const r = sh('git', ['rev-parse', 'HEAD'], { cwd });
  return r.ok ? r.out : '';
}

/** Ensure .live-sim and cache files are ignored by git */
export function ensureGitignore(cwd) {
  const gitignorePath = join(cwd, '.gitignore');
  let current = '';
  if (existsSync(gitignorePath)) {
    current = readFileSync(gitignorePath, 'utf8');
  }

  const toAdd = LIVE_SIM_GITIGNORE.filter((entry) => !current.includes(entry));
  if (toAdd.length > 0) {
    const textToAdd = (current && !current.endsWith('\n') ? '\n' : '') + toAdd.join('\n') + '\n';
    appendFileSync(gitignorePath, textToAdd, 'utf8');
  }
}
