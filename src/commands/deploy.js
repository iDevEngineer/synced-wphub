import { join } from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';

import { readConfig, getSitePath } from '../lib/config.js';
import { readStagingConfig, writeStagingConfig, stagingConfigExists } from '../lib/staging.js';
import { getProvider } from '../lib/providers/index.js';
import { logger } from '../utils/logger.js';
import { input, select, confirm } from '../utils/prompt.js';

/**
 * Derive a slug from a client name — matches the convention used in new.js and config.js
 */
function toSlug(clientName) {
  return clientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Run first-time staging setup for a site, prompting the user for provider details.
 * Returns the completed staging config object.
 */
async function runStagingSetup(slug) {
  logger.title('First-time staging setup');
  logger.divider();

  const provider = await select('Hosting provider', [
    { name: 'Generic (SSH)', value: 'generic' },
    { name: 'WP Engine', value: 'wpengine' },
    { name: 'Kinsta', value: 'kinsta' },
    { name: 'Dokploy', value: 'dokploy' },
  ]);

  const config = { slug, provider };

  if (provider === 'wpengine') {
    // WP Engine uses ssh.wpengine.net — sshUser is the install name
    config.sshHost = 'ssh.wpengine.net';
    config.sshUser = await input('WP Engine install name (SSH user)', slug);
    config.wpPath = `/sites/${config.sshUser}`;
    config.themePath = `/sites/${config.sshUser}/wp-content/themes/${slug}`;
    config.stagingUrl = await input('Staging URL', `https://${config.sshUser}.wpengine.com`);
  } else {
    config.sshHost = await input('SSH host (e.g. staging.clientsite.com)');
    config.sshUser = await input('SSH user', 'deploy');
    config.wpPath = await input('WordPress path on server', '/var/www/html');
    config.themePath = `${config.wpPath}/wp-content/themes/${slug}`;
    config.stagingUrl = await input('Staging URL', `https://staging.${config.sshHost.replace(/^[^.]+\./, '')}`);
  }

  if (provider === 'dokploy') {
    logger.blank();
    logger.info('Dokploy API (optional — press Enter to skip)');
    config.dokployUrl = await input('Dokploy URL (e.g. https://deploy.yourdomain.com)', '');
    if (config.dokployUrl) {
      config.dokployToken = await input('Dokploy API token', '');
      config.dokployAppId = await input('Dokploy application ID', '');
    }
  }

  if (provider === 'kinsta') {
    logger.blank();
    logger.info('Kinsta API (optional — press Enter to skip)');
    config.kinstaApiKey = await input('Kinsta API key', '');
    if (config.kinstaApiKey) {
      config.kinstaSiteId = await input('Kinsta site ID', '');
    }
  }

  writeStagingConfig(slug, config);
  logger.success(`Staging config saved to ~/.synced/sites/${slug}.json`);
  return config;
}

/**
 * Ensure a GitHub repo exists for the site. Creates it (private) if not.
 * Updates the staging config with the repo slug if newly created.
 *
 * @param {string} sitePath - absolute path to the site directory
 * @param {string} slug - site slug
 * @param {object} stagingConfig - staging config object (mutated in-place)
 */
async function ensureGitHubRepo(sitePath, slug, stagingConfig) {
  // Check if remote already exists in the local git repo
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: sitePath });
    const remote = stdout.trim();
    if (remote) {
      logger.info(`GitHub remote already set: ${remote}`);
      // Extract owner/repo from remote URL if not already stored
      if (!stagingConfig.githubRepo) {
        const match = remote.match(/[:/]([^/]+\/[^/.]+)(\.git)?$/);
        if (match) {
          stagingConfig.githubRepo = match[1];
          writeStagingConfig(slug, stagingConfig);
        }
      }
      return;
    }
  } catch {
    // No remote set — continue to create repo
  }

  // Check for existing GitHub repo via gh CLI
  const repoName = `synced-${slug}`;
  logger.step(`Checking GitHub for repo ${repoName}...`);

  try {
    const { stdout } = await execa('gh', ['repo', 'view', repoName, '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
    const nameWithOwner = stdout.trim();
    logger.info(`GitHub repo exists: ${nameWithOwner}`);
    stagingConfig.githubRepo = nameWithOwner;
    writeStagingConfig(slug, stagingConfig);

    // Set remote if not already set
    await execa('git', ['remote', 'add', 'origin', `git@github.com:${nameWithOwner}.git`], { cwd: sitePath });
    logger.success('Remote origin set.');
    return;
  } catch {
    // Repo does not exist — create it
  }

  logger.step(`Creating private GitHub repo: ${repoName}...`);
  try {
    const { stdout } = await execa('gh', [
      'repo', 'create', repoName,
      '--private',
      '--source', sitePath,
      '--push',
    ]);
    logger.success(`GitHub repo created and initial push done.`);

    // Read back the remote to store in config
    try {
      const { stdout: remoteUrl } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: sitePath });
      const match = remoteUrl.trim().match(/[:/]([^/]+\/[^/.]+)(\.git)?$/);
      if (match) {
        stagingConfig.githubRepo = match[1];
        writeStagingConfig(slug, stagingConfig);
      }
    } catch {
      // Non-fatal — repo was created, remote just not stored
    }
  } catch (err) {
    throw new Error(`Failed to create GitHub repo: ${err.message}`);
  }
}

/**
 * Commit and push current state to GitHub.
 */
async function gitCommitAndPush(sitePath) {
  logger.step('Committing and pushing to GitHub...');
  try {
    await execa('git', ['add', '.'], { cwd: sitePath });

    // Check if there is anything to commit
    const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: sitePath });
    if (status.trim()) {
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await execa('git', ['commit', '-m', `deploy: ${timestamp}`], { cwd: sitePath });
      logger.success('Changes committed.');
    } else {
      logger.info('Nothing new to commit.');
    }

    await execa('git', ['push', 'origin', 'HEAD'], { cwd: sitePath });
    logger.success('Pushed to GitHub.');
  } catch (err) {
    throw new Error(`Git push failed: ${err.message}`);
  }
}

/**
 * synced deploy <clientName>
 *
 * Deploys the client's WordPress theme to staging.
 */
export async function deployCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced deploy "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = toSlug(clientName);

  // 1. Check main config
  const config = readConfig();
  if (!config) {
    logger.error('No Synced config found. Run `synced setup` first.');
    process.exit(1);
  }

  const sitePath = getSitePath(config, clientName);

  if (!existsSync(sitePath)) {
    logger.error(`Site directory not found: ${sitePath}`);
    logger.info(`Run \`synced new "${clientName}"\` to create it first.`);
    process.exit(1);
  }

  logger.title(`Deploying ${clientName} to staging`);
  logger.divider();

  // 2. Staging config — first-time setup if needed
  let stagingConfig;
  if (stagingConfigExists(slug)) {
    stagingConfig = readStagingConfig(slug);
    logger.info(`Provider: ${stagingConfig.provider} — ${stagingConfig.stagingUrl}`);
  } else {
    stagingConfig = await runStagingSetup(slug);
  }

  // 3. Ensure GitHub repo exists
  try {
    await ensureGitHubRepo(sitePath, slug, stagingConfig);
  } catch (err) {
    logger.error(`GitHub repo setup failed: ${err.message}`);
    process.exit(1);
  }

  // 4. Git commit + push
  try {
    await gitCommitAndPush(sitePath);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // 5. Provider deploy
  logger.blank();
  logger.step(`Running ${stagingConfig.provider} deploy...`);
  try {
    const provider = getProvider(stagingConfig.provider);
    await provider.deploy(stagingConfig, sitePath, slug);
  } catch (err) {
    logger.error(`Deploy failed: ${err.message}`);
    process.exit(1);
  }

  // 6. Success
  logger.blank();
  logger.divider();
  logger.success(`${clientName} deployed to staging!`);
  logger.blank();
  logger.info(`  Staging URL: ${stagingConfig.stagingUrl}`);
  if (stagingConfig.githubRepo) {
    logger.info(`  GitHub:      https://github.com/${stagingConfig.githubRepo}`);
  }
  logger.divider();
}
