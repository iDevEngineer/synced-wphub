import { writeConfig, readConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { confirm, input, password, select } from '../utils/prompt.js';

/**
 * synced setup
 *
 * First-run Hub setup. Guides the user through:
 *  1. Sites directory location
 *  2. GitHub PAT (optional)
 *  3. AI provider preference
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

  // 1. Sites directory
  const sitesPath = await input(
    'Where would you like to store your sites?',
    '~/synced-sites'
  );

  // 2. GitHub
  const connectGitHub = await confirm('Connect GitHub? (recommended)', true);
  let github = { connected: false, token: null };

  if (connectGitHub) {
    logger.info('Create a Personal Access Token at https://github.com/settings/tokens');
    logger.info('Required scope: repo');
    const token = await password('Enter your GitHub Personal Access Token:');
    if (token && token.trim()) {
      github = { connected: true, token: token.trim() };
      logger.success('GitHub token saved.');
    } else {
      logger.warn('No token provided — GitHub integration skipped.');
    }
  }

  // 3. AI provider
  const ai = await select('Which AI are you using?', [
    { name: 'claude', message: 'Claude (Anthropic)' },
    { name: 'chatgpt', message: 'ChatGPT / Codex (OpenAI)' },
    { name: 'other', message: 'Other' },
    { name: 'skip', message: 'Skip for now' },
  ]);

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
  logger.blank();
  logger.info('Run `synced new "Client Name"` to create your first site.');
}
