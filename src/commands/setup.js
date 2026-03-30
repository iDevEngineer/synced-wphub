import { writeConfig, readConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { confirm, input, password, select } from '../utils/prompt.js';
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
 * Install WP-CLI. Uses PHP via system (WP-CLI still needs a PHP binary
 * for its phar runner even though wp-now uses WASM). Installs to ~/.local/bin.
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
 * First-run Hub setup. Guides the user through:
 *  1. Prerequisite checks (Git, Node 22+)
 *  2. Sites directory location
 *  3. GitHub PAT (optional)
 *  4. AI provider preference
 *  5. WP-CLI install (optional — for DB export/import in phase 2)
 *
 * Note: PHP and MySQL are NOT prerequisites for the dev.
 *  - PHP: wp-now runs WordPress via WASM — no PHP install needed.
 *  - MySQL: managed by Synced per site — the dev never touches it.
 *
 * Saves result to ~/.synced/config.json
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

  logger.title('Synced Hub — First Run Setup');
  logger.divider();
  logger.info('Prerequisites: Git and Node.js 22+. Everything else is handled by Synced.');
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

  // 2. Sites directory
  const sitesPath = await input(
    'Where would you like to store your sites?',
    '~/Synced-Sites'
  );

  // 3. GitHub PAT
  logger.info('Get your token at: https://github.com/settings/tokens (scope: repo)');
  const token = await password('GitHub Personal Access Token (repo scope):');
  let github = { connected: false, token: null };
  if (token && token.trim()) {
    github = { connected: true, token: token.trim() };
    logger.success('GitHub token saved.');
  } else {
    logger.warn('No token provided — repos will not be created automatically. Re-run setup to add it later.');
  }

  // 4. AI provider
  const ai = await select('Which AI are you using?', [
    { name: 'claude', message: 'Claude (Anthropic)' },
    { name: 'chatgpt', message: 'ChatGPT / Codex (OpenAI)' },
    { name: 'other', message: 'Other' },
    { name: 'skip', message: 'Skip for now' },
  ]);

  // 5. WP-CLI — install automatically if not found
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
  const config = { sitesPath, github, ai };
  writeConfig(config);

  logger.blank();
  logger.success('Setup complete! Config saved to ~/.synced/config.json');
  logger.divider();
  logger.info(`Sites path:  ${sitesPath}`);
  logger.info(`GitHub:      ${github.connected ? 'connected' : 'not connected'}`);
  logger.info(`AI:          ${ai}`);
  logger.info(`WP-CLI:      ${wpInstalled ? 'installed' : 'installed (check above)'}`);
  logger.blank();
  logger.info('Run `synced new "Client Name"` to create your first site.');
}
