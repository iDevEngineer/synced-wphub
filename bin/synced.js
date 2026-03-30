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
  .command('uninstall')
  .description('Completely remove Synced WP — CLI, config, cache, and optionally sites')
  .action(async () => {
    try {
      await uninstallCommand();
    } catch (err) {
      console.error('Uninstall failed:', err.message);
      process.exit(1);
    }
  });

// Show help if no command provided
program.addHelpText('after', `
Examples:
  $ synced setup
  $ synced new "Acme Corp"
  $ synced theme "Acme Corp"
`);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
