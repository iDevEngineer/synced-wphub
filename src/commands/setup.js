import { writeConfig, readConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { confirm } from '../utils/prompt.js';
import { execa } from 'execa';
import { existsSync, chmodSync, mkdirSync } from 'fs';
import { join } from 'path';
import os, { homedir } from 'os';

/**
 * Check Git is installed.
 */
async function checkGit() {
  try {
    const { stdout } = await execa('git', ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check Node.js version >= 22.
 */
async function checkNode() {
  try {
    const { stdout } = await execa('node', ['--version']);
    const ver = parseInt(stdout.replace('v', '').split('.')[0], 10);
    if (ver >= 22) return stdout.trim();
    return { tooOld: true, version: stdout.trim() };
  } catch {
    return null;
  }
}

/**
 * Check if WP-CLI is installed and in PATH.
 */
async function isWpCliInstalled() {
  try {
    await execa('wp', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install WP-CLI automatically. Installs to ~/.local/bin — no sudo needed.
 */
async function installWpCli() {
  const platform = os.platform();

  if (platform === 'win32') {
    logger.warn('WP-CLI auto-install is not supported on Windows.');
    logger.info('Install manually: https://wp-cli.org/#installing');
    return false;
  }

  try {
    logger.step('Downloading WP-CLI...');
    await execa('curl', [
      '-fsSL',
      '-o', '/tmp/wp-cli.phar',
      'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
    ]);

    chmodSync('/tmp/wp-cli.phar', '755');

    const installDir = join(homedir(), '.local', 'bin');
    mkdirSync(installDir, { recursive: true });
    const installPath = join(installDir, 'wp');
    logger.step(`Installing WP-CLI to ${installPath}...`);
    await execa('mv', ['/tmp/wp-cli.phar', installPath]);

    logger.success('WP-CLI installed to ~/.local/bin/wp');
    logger.info('Ensure ~/.local/bin is in your PATH. Add to ~/.zshrc or ~/.bashrc:');
    logger.info('  export PATH="$HOME/.local/bin:$PATH"');
    return true;
  } catch (err) {
    logger.warn(`WP-CLI auto-install failed: ${err.message}`);
    logger.info('Install manually: https://wp-cli.org/#installing');
    return false;
  }
}

/**
 * synced setup
 *
 * Prerequisites (dev must have these before running):
 *   - Git
 *   - Node.js 22+
 *   - GitHub account (used when creating repos via `synced new`)
 *
 * Setup only asks one thing: where to store sites.
 * Everything else is handled automatically by Synced.
 */
export async function setupCommand(options = {}) {
  const existing = readConfig();

  if (existing && !options.force) {
    logger.info('Synced is already configured.');
    const redo = await confirm('Re-run setup? This will overwrite your current config.', false);
    if (!redo) {
      logger.info('Setup cancelled.');
      return;
    }
  }

  logger.title('Synced Hub — Setup');
  logger.divider();
  logger.info('Prerequisites: Git, Node.js 22+, and a GitHub account.');
  logger.blank();

  // 1. Prerequisite checks
  logger.step('Checking prerequisites...');

  const gitVersion = await checkGit();
  if (!gitVersion) {
    logger.error('Git not found. Install from https://git-scm.com');
    process.exit(1);
  }
  logger.success(`Git: ${gitVersion}`);

  const nodeResult = await checkNode();
  if (!nodeResult) {
    logger.error('Node.js not found. Install v22+ from https://nodejs.org');
    process.exit(1);
  }
  if (nodeResult.tooOld) {
    logger.error(`Node.js ${nodeResult.version} is too old. v22+ required. Install from https://nodejs.org`);
    process.exit(1);
  }
  logger.success(`Node.js: ${nodeResult}`);

  logger.blank();

  // 2. Sites directory — default, no prompt
  const sitesPath = '~/Synced-Sites';

  // 3. WP-CLI — install automatically if not found
  logger.blank();
  logger.step('Checking WP-CLI...');
  const wpInstalled = await isWpCliInstalled();
  if (wpInstalled) {
    logger.success('WP-CLI is installed.');
  } else {
    logger.info('WP-CLI not found — installing...');
    await installWpCli();
  }

  // Save config
  const config = { sitesPath };
  writeConfig(config);

  logger.blank();
  logger.success('Setup complete!');
  logger.divider();
  logger.info(`Sites path:  ${sitesPath}`);
  logger.info(`WP-CLI:      ${wpInstalled ? 'installed' : 'installed (check above)'}`);
  logger.blank();
  logger.info('Run `synced new "Client Name"` to create your first site.');
}
