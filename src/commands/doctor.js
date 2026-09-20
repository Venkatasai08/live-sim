/**
 * ============================================================================
 * live-sim Doctor Diagnostic (doctor.js)
 * ============================================================================
 * Performs a comprehensive health check of the local machine environment:
 * verifies Node.js, Expo project structure, Git, and GitHub CLI authentication.
 * ============================================================================
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { sh, has } from '../lib/proc.js';
import { assertExpoProject } from '../lib/metro.js';
import { WORKFLOW_PATH, GATE_PATH } from './init.js';
import { green, red, yellow, dim, bold } from '../lib/ui.js';

const PASS = green('✓');
const FAIL = red('✗');
const WARN = yellow('!');

export async function doctor(cwd) {
  const checks = [];
  const add = (icon, label, detail = '') => checks.push(`  ${icon} ${label}${detail ? ` ${dim(detail)}` : ''}`);

  console.log(`\n${bold('live-sim doctor (Environment & Diagnostic Check)')}\n`);

  // 1. Expo / React Native project validation
  try {
    const pkg = assertExpoProject(cwd);
    add(PASS, 'Expo / React Native project', `${pkg.name} (${pkg.version})`);
  } catch (err) {
    add(FAIL, 'Project Check', err.message.split('\n')[0]);
  }

  // 2. Git installation
  add(has('git') ? PASS : FAIL, 'Git installed');

  // 3. GitHub CLI and Authentication
  if (!has('gh')) {
    add(FAIL, 'GitHub CLI (gh)', 'Run: winget install GitHub.cli');
  } else {
    add(PASS, 'GitHub CLI (gh)');
    const authStatus = sh('gh', ['auth', 'status']);
    if (!authStatus.ok) {
      add(FAIL, 'GitHub Authentication', 'Run: gh auth login');
    } else {
      add(PASS, 'GitHub Authentication');
    }
  }

  // 4. Node.js version
  add(PASS, 'Node.js runtime', process.version);

  // 5. Workflow files in repository
  const hasWorkflow = existsSync(join(cwd, WORKFLOW_PATH));
  const hasGate = existsSync(join(cwd, GATE_PATH));
  if (hasWorkflow && hasGate) {
    add(PASS, 'live-sim workflow files present');
  } else {
    add(WARN, 'live-sim workflow files', 'Will be scaffolded automatically on `live-sim start`');
  }

  console.log(checks.join('\n'));
  console.log('');
}
