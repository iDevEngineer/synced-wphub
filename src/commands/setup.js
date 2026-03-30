import { writeConfig, readConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { confirm, input, password, select } from '../utils/prompt.js';
import { execa } from 'execa';
import { existsSync, chmodSync, mkdirSync } from 'fs';
import { join } from 'path';
import os, { homedir } from 'os';

/**
 * Check if PHP is installed. Returns version string or null.
 */
async function isPhpInstalled() {
  try {
    const { stdout } = await execa('php', ['--version']);
    const match = stdout.match(/PHP (\d+\.\d+\.\d+)/);
    return match ? match[1] : 'installed';
  } catch {
    return null;
  }
}

/**
 * Check if MySQL is installed and running. Returns version string or null.
 */
async function isMysqlInstalled() {
  try {
    const { stdout } = await execa('mysql', ['--version']);
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : 'installed';
  } catch {
    return null;
  }
}

async function isMysqlRunning() {
  try {
    await execa('mysqladmin', ['ping', '--silent']);
    return true;
  } catch {
    return false;
  }
}

function getMysqlInstallInstructions() {
  const platform = os.platform();
  if (platform === 'darwin') {
    return [
      'Install MySQL: brew install mysql',
      'Then start it: brew services start mysql',
    ];
  } else if (platform === 'linux') {
    return [
      'Install MySQL: sudo apt install mysql-server  (or: sudo dnf install mysql-server)',
      'Then start it: sudo systemctl start mysql',
    ];
  }
  return ['Install MySQL: https://dev.mysql.com/downloads/'];
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
 * Install WP-CLI on Mac/Linux.
 * Downloads the phar and installs to /usr/local/bin/wp.
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
      '-o', '/tmp/wp-cli.phar',
      'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar'
    ]);

    chmodSync('/tmp/wp-cli.phar', '755');

    // Install to ~/.local/bin to avoid needing sudo
    const installDir = join(homedir(), '.local', 'bin');
    mkdirSync(installDir, { recursive: true });
    const installPath = join(installDir, 'wp');
    logger.step(`Installing WP-CLI to ${installPath}...`);
    await execa('mv', ['/tmp/wp-cli.phar', installPath]);

    logger.success('WP-CLI installed to ~/.local/bin/wp');
    logger.info('Ensure ~/.local/bin is in your PATH. Add to ~/.zshrc or ~/.bashrc: export PATH="$HOME/.local/bin:$PATH"');
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
 *  1. Sites directory location
 *  2. GitHub PAT
 *  3. AI provider preference
 *  4. WP-CLI install check
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
  logger.info('Prerequisites: Git, Node.js 22+, PHP, MySQL, and a GitHub account with a Personal Access Token.');
  logger.info('Get your token at: https://github.com/settings/tokens (scope: repo)');
  logger.blank();

  // 1. Sites directory
  const sitesPath = await input(
    'Where would you like to store your sites?',
    '~/Synced-Sites'
  );

  // 2. GitHub PAT
  const token = await password('GitHub Personal Access Token (repo scope):');
  let github = { connected: false, token: null };
  if (token && token.trim()) {
    github = { connected: true, token: token.trim() };
    logger.success('GitHub token saved.');
  } else {
    logger.warn('No token provided — repos will not be created automatically. Re-run setup to add it later.');
  }

  // 3. AI provider
  const ai = await select('Which AI are you using?', [
    { name: 'claude', message: 'Claude (Anthropic)' },
    { name: 'chatgpt', message: 'ChatGPT / Codex (OpenAI)' },
    { name: 'other', message: 'Other' },
    { name: 'skip', message: 'Skip for now' },
  ]);

  // 4. MySQL check
  logger.blank();
  logger.step('Checking MySQL...');
  const mysqlInstalled = await isMysqlInstalled();
  if (mysqlInstalled) {
    const running = await isMysqlRunning();
    if (running) {
      logger.success(`MySQL ${mysqlInstalled} — running`);
    } else {
      logger.warn(`MySQL ${mysqlInstalled} installed but not running.`);
      const platform = os.platform();
      if (platform === 'darwin') {
        logger.info('Start it: brew services start mysql');
      } else {
        logger.info('Start it: sudo systemctl start mysql');
      }
    }
  } else {
    logger.warn('MySQL not found. Required for local WordPress sites.');
    getMysqlInstallInstructions().forEach(line => logger.info(line));
    logger.info('After installing MySQL, re-run `synced setup`.');
  }

  // 5. PHP check
  logger.blank();
  logger.step('Checking PHP...');
  const phpInstalled = await isPhpInstalled();
  if (phpInstalled) {
    logger.success(`PHP: ${phpInstalled}`);
  } else {
    logger.warn('PHP not found. WP-CLI requires PHP.');
    const platform = os.platform();
    if (platform === 'darwin') {
      const hasBrew = await execa('command', ['-v', 'brew']).then(() => true).catch(() => false);
      if (hasBrew) {
        logger.info('Install PHP: brew install php');
      } else {
        logger.info('Install Homebrew first: https://brew.sh');
        logger.info('Then install PHP: brew install php');
      }
    } else if (platform === 'linux') {
      const hasApt = await execa('command', ['-v', 'apt']).then(() => true).catch(() => false);
      const hasDnf = await execa('command', ['-v', 'dnf']).then(() => true).catch(() => false);
      if (hasApt) {
        logger.info('Install PHP: sudo apt install php php-cli');
      } else if (hasDnf) {
        logger.info('Install PHP: sudo dnf install php php-cli');
      } else {
        logger.info('Install PHP for your distro: https://www.php.net/manual/en/install.unix.php');
      }
    } else {
      logger.info('Install PHP: https://www.php.net/downloads');
    }
    logger.info('After installing PHP, re-run `synced setup` to complete WP-CLI installation.');
  }

  // 5. WP-CLI check and install
  logger.blank();
  logger.step('Checking WP-CLI...');
  const wpInstalled = await isWpCliInstalled();

  if (wpInstalled) {
    logger.success('WP-CLI is already installed.');
  } else if (!phpInstalled) {
    logger.warn('Skipping WP-CLI install — PHP required first.');
  } else {
    logger.warn('WP-CLI not found.');
    const installWp = await confirm('Install WP-CLI now? (recommended)', true);
    if (installWp) {
      await installWpCli();
    } else {
      logger.info('Skipping WP-CLI — install manually later: https://wp-cli.org/#installing');
    }
  }

  // Save config
  const config = {
    sitesPath,
    github,
    ai,
  };

  writeConfig(config);

  logger.blank();
  logger.success('Setup complete! Config saved to ~/.synced/config.json');
  logger.divider();
  logger.info(`Sites path:  ${sitesPath}`);
  logger.info(`GitHub:      ${github.connected ? 'connected' : 'not connected'}`);
  logger.info(`AI:          ${ai}`);
  logger.info(`MySQL:       ${mysqlInstalled ? mysqlInstalled : 'not found — see above'}`);
  logger.info(`PHP:         ${phpInstalled ? phpInstalled : 'not found — see above'}`);
  logger.info(`WP-CLI:      ${wpInstalled ? 'installed' : 'not installed — re-run setup after installing PHP'}`);
  logger.blank();
  logger.info('Run `synced new "Client Name"` to create your first site.');
}
