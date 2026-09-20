/**
 * ============================================================================
 * live-sim CLI Router (cli.js)
 * ============================================================================
 * Handles command line argument parsing, help output, and dispatching
 * to command modules (start, init, doctor, status, down).
 * ============================================================================
 */

import { start } from './commands/start.js';
import { init } from './commands/init.js';
import { doctor } from './commands/doctor.js';
import { status } from './commands/status.js';
import { down } from './commands/down.js';
import { bold, dim, cyan, yellow } from './lib/ui.js';

const HELP = `
${bold('live-sim')} — Zero-push live iOS simulator streaming with sub-second Fast Refresh

${bold('USAGE')}
  live-sim <command> [options]

${bold('COMMANDS')}
  start     Start local Metro with tunnel + boot cloud iOS simulator + stream ${dim('(default)')}
  init      Scaffold .github/workflows/live-sim.yml and auth gate into project
  doctor    Verify local environment, Git, and GitHub CLI prerequisites
  status    Inspect active session, tunnel link, and stream URL
  down      Cancel remote runner and clean up local session

${bold('OPTIONS')} ${dim('(for live-sim start)')}
  --minutes <n>     Session stream duration in minutes        ${dim('default 60, max 350')}
  --device <name>   Target iOS Simulator device               ${dim('default "iPhone 16 Pro"')}
  --fps <n>         MJPEG stream framerate                    ${dim('default 30')}
  --quality <n>     MJPEG stream quality                      ${dim('0.05 - 1.0, default 0.7')}
  --public          Create public repo                        ${dim('(free unlimited GitHub minutes)')}
  --private         Create private repo
  --no-open         Do not automatically launch browser

${bold('EXAMPLES')}
  live-sim start
  live-sim start --device "iPhone 16 Pro Max" --minutes 90
  live-sim doctor
  live-sim down
`;

/**
 * Parse CLI argument flags and positional arguments.
 * @param {string[]} args
 */
export function parseArgs(args) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.startsWith('no-')) {
        flags[key] = true;
        flags[key.slice(3)] = false;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

/**
 * Main CLI entrypoint function.
 */
export async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0] || 'start';
  const cwd = process.cwd();

  if (flags.help || flags.h || command === 'help') {
    console.log(HELP);
    return;
  }

  switch (command) {
    case 'start':
      await start(cwd, flags);
      break;
    case 'init':
      await init(cwd, flags);
      break;
    case 'doctor':
      await doctor(cwd);
      break;
    case 'status':
      await status(cwd);
      break;
    case 'down':
      await down(cwd);
      break;
    default:
      console.error(`Unknown command: ${command}\nRun 'live-sim --help' for usage.`);
      process.exit(1);
  }
}
