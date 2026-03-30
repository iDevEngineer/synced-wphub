#!/usr/bin/env node

import { program } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { setupCommand } from '../src/commands/setup.js';
import { newCommand } from '../src/commands/new.js';
import { themeCommand } from '../src/commands/theme.js';
import { uninstallCommand } from '../src/commands/uninstall.js';
import { deployCommand } from '../src/commands/deploy.js';
import { pushCommand } from '../src/commands/push.js';
import { pullCommand } from '../src/commands/pull.js';
import { startCommand } from '../src/commands/start.js';
import { stopCommand } from '../src/commands/stop.js';
import { listCommand } from '../src/commands/list.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

program
  .name('synced')
  .description('WordPress agency local development environment tool')
  .version(pkg.version);

program
  .command('setup')
  .description('First-run Hub setup — configure sites path, GitHub, and AI provider')
  .option('-f, --force', 'Re-run setup even if config already exists')
  .action(async (options) => {
    try {
      await setupCommand(options);
    } catch (err) {
      console.error('Setup failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('new <clientName>')
  .description('Create a new WordPress site for a client')
  .action(async (clientName) => {
    try {
      await newCommand(clientName);
    } catch (err) {
      console.error('Failed to create site:', err.message);
      process.exit(1);
    }
  });

program
  .command('theme <clientName>')
  .description('Update theme configuration for an existing site')
  .action(async (clientName) => {
    try {
      await themeCommand(clientName);
    } catch (err) {
      console.error('Theme update failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('deploy <clientName>')
  .description('Deploy theme to staging')
  .action(async (clientName) => {
    try {
      await deployCommand(clientName);
    } catch (err) {
      console.error('Deploy failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Completely remove Synced WP — CLI, config, cache, and optionally sites')
  .option('--sites', 'Also remove ~/Synced-Sites and all local sites')
  .action(async (options) => {
    try {
      await uninstallCommand(options);
    } catch (err) {
      console.error('Uninstall failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('start <clientName>')
  .description('Start a local WordPress site')
  .action(async (clientName) => {
    try {
      await startCommand(clientName);
    } catch (err) {
      console.error('Start failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('stop <clientName>')
  .description('Stop a running WordPress site')
  .action(async (clientName) => {
    try {
      await stopCommand(clientName);
    } catch (err) {
      console.error('Stop failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('push <clientName>')
  .description('Push local database and files to staging')
  .option('--no-media', 'Skip media sync')
  .action(async (clientName, options) => {
    try {
      await pushCommand(clientName, options);
    } catch (err) {
      console.error('Push failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('pull <clientName>')
  .description('Pull staging database and files to local')
  .option('--no-media', 'Skip media sync')
  .action(async (clientName, options) => {
    try {
      await pullCommand(clientName, options);
    } catch (err) {
      console.error('Pull failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all local sites and their status')
  .action(async () => {
    try {
      await listCommand();
    } catch (err) {
      console.error('List failed:', err.message);
      process.exit(1);
    }
  });

// Show help if no command provided
program.addHelpText('after', `
Examples:
  $ synced setup
  $ synced new "Acme Corp"
  $ synced start "Acme Corp"
  $ synced stop "Acme Corp"
  $ synced list
  $ synced theme "Acme Corp"
  $ synced deploy "Acme Corp"
  $ synced push "Acme Corp"
  $ synced push "Acme Corp" --no-media
  $ synced pull "Acme Corp"
  $ synced pull "Acme Corp" --no-media
`);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
