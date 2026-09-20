/**
 * ============================================================================
 * live-sim Init Command (init.js)
 * ============================================================================
 * Scaffolds the `.github/workflows/live-sim.yml` and `.github/live-sim/gate.cjs`
 * template files into the user's project with automatic version tracking.
 * ============================================================================
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertExpoProject } from '../lib/metro.js';
import { ensureGitignore } from '../lib/git.js';
import { ok, info } from '../lib/ui.js';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export const WORKFLOW_PATH = '.github/workflows/live-sim.yml';
export const GATE_PATH = '.github/live-sim/gate.cjs';

const VERSION_RE = /live-sim-template-version:\s*(\d+)/;
const versionOf = (text) => Number(text.match(VERSION_RE)?.[1] ?? 0);

/**
 * Writes or upgrades the workflow and auth gate files in the target project.
 * @param {string} cwd - Project directory
 * @param {{ force?: boolean }} opts
 * @returns {boolean} Whether any file was created or updated
 */
export function scaffold(cwd, { force = false } = {}) {
  let changed = false;

  const files = [
    {
      src: join(TEMPLATES, 'live-sim.yml'),
      dst: join(cwd, WORKFLOW_PATH),
      label: WORKFLOW_PATH,
    },
    {
      src: join(TEMPLATES, 'gate.cjs'),
      dst: join(cwd, GATE_PATH),
      label: GATE_PATH,
    },
  ];

  for (const { src, dst, label } of files) {
    const tmpl = readFileSync(src, 'utf8');
    const dir = dirname(dst);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (!existsSync(dst)) {
      writeFileSync(dst, tmpl, 'utf8');
      changed = true;
      ok(`wrote ${label}`);
      continue;
    }

    if (force) {
      writeFileSync(dst, tmpl, 'utf8');
      changed = true;
      ok(`overwrote ${label}`);
      continue;
    }

    const current = readFileSync(dst, 'utf8');
    const curVer = versionOf(current);
    const tmplVer = versionOf(tmpl);

    if (curVer < tmplVer) {
      writeFileSync(dst, tmpl, 'utf8');
      changed = true;
      ok(`updated ${label} (v${curVer} -> v${tmplVer})`);
    }
  }

  ensureGitignore(cwd);
  return changed;
}

export async function init(cwd, flags = {}) {
  assertExpoProject(cwd);
  const changed = scaffold(cwd, { force: Boolean(flags.force) });
  if (!changed) {
    info('live-sim workflow and auth gate are already up to date');
  }
}
