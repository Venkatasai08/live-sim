/**
 * ============================================================================
 * live-sim Session Storage & State (session.js)
 * ============================================================================
 * Persists live session parameters (run ID, token, stream URL, Metro PID)
 * inside `.live-sim/session.json` to allow inspection and clean shutdown.
 * ============================================================================
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SESSION_DIR = '.live-sim';
const SESSION_FILE = 'session.json';

export function sessionPath(cwd) {
  return join(cwd, SESSION_DIR, SESSION_FILE);
}

/** Save active session data to disk */
export function saveSession(cwd, data) {
  const dir = join(cwd, SESSION_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(sessionPath(cwd), JSON.stringify({ ...data, savedAt: Date.now() }, null, 2), 'utf8');
}

/** Load existing session data */
export function loadSession(cwd) {
  const file = sessionPath(cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Delete session file */
export function clearSession(cwd) {
  const file = sessionPath(cwd);
  if (existsSync(file)) {
    try {
      rmSync(file, { force: true });
    } catch {}
  }
}
