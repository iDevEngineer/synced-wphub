import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execa } from 'execa';

import { readConfig, getSitePath } from '../lib/config.js';
import { readStagingConfig, writeStagingConfig, stagingConfigExists } from '../lib/staging.js';
import { getSiteRunning } from '../lib/sites.js';
import { sshRun, scpTo, rsyncTo } from '../lib/ssh.js';
import { logger } from '../utils/logger.js';
import { input, select, confirm } from '../utils/prompt.js';

/**
 * Derive a slug from a client name — matches the convention in new.js / start.js.
 */
function toSlug(clientName) {
  return clientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Resolve the WP-CLI binary path.
 * Prefers ~/.local/bin/wp; falls back to 'wp' in PATH.
 */
function resolveWpBin() {
  const localWp = join(homedir(), '.local', 'bin', 'wp');
  return existsSync(localWp) ? localWp : 'wp';
}

/**
 * Ensure the backup directory exists for a slug.
 */
function ensureBackupDir(slug) {
  const dir = join(homedir(), '.synced', 'backups', slug);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * ISO timestamp suitable for filenames (no colons).
 */
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * First-time staging setup — prompts for host, user, wpPath, stagingUrl, provider.
 * Mirrors the pattern in deploy.js.
 * Returns the saved staging config.
 */
export async function runStagingSetup(slug, clientName) {
  logger.blank();
  logger.step(`No staging config found for "${clientName}". Let's set it up.`);
  logger.blank();

  const provider = await select('Hosting provider', [
    { name: 'Generic (SSH)', value: 'generic' },
    { name: 'WP Engine', value: 'wpengine' },
    { name: 'Kinsta', value: 'kinsta' },
    { name: 'Dokploy', value: 'dokploy' },
  ]);

  const config = { slug, provider };

  if (provider === 'wpengine') {
    config.sshHost = 'ssh.wpengine.net';
    config.sshUser = await input('WP Engine install name (SSH user)', slug);
    config.wpPath = `/sites/${config.sshUser}`;
    config.themePath = `/sites/${config.sshUser}/wp-content/themes/${slug}`;
    config.stagingUrl = await input('Staging URL', `https://${config.sshUser}.wpengine.com`);
  } else {
    config.sshHost = await input('Staging host (e.g. staging.clientsite.com)');
    config.sshUser = await input('SSH user', 'deploy');
    config.wpPath = await input('WordPress path on staging (e.g. /var/www/html)', '/var/www/html');
    config.themePath = `${config.wpPath}/wp-content/themes/${slug}`;
    config.stagingUrl = await input('Staging URL (e.g. https://staging.clientsite.com)');
  }

  if (provider === 'dokploy') {
    logger.blank();
    logger.info('Dokploy API (optional — press Enter to skip)');
    config.dokployUrl = await input('Dokploy URL', '');
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
  logger.success(`Staging config saved → ~/.synced/sites/${slug}.json`);
  return config;
}

/**
 * Check that WP-CLI is available on the staging server.
 * Throws a helpful error with install instructions if not found.
 */
async function checkRemoteWpCli(host, user) {
  try {
    await sshRun(host, user, 'which wp || wp --info --allow-root > /dev/null 2>&1', {
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      `WP-CLI not found on ${user}@${host}.\n` +
      `Install it with:\n` +
      `  curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar\n` +
      `  chmod +x wp-cli.phar && sudo mv wp-cli.phar /usr/local/bin/wp`
    );
  }
}

/**
 * synced push <clientName>
 *
 * Push local SQLite database and media files to staging.
 *
 * @param {string} clientName
 * @param {{ media: boolean }} options
 */
export async function pushCommand(clientName, options = {}) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced push "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = toSlug(clientName);
  const wpBin = resolveWpBin();

  // 1. Main config
  const config = readConfig();
  if (!config) {
    logger.error('No Synced config found. Run `synced setup` first.');
    process.exit(1);
  }

  const sitePath = getSitePath(config, clientName);

  // 2. Staging config — first-time setup if missing
  let stagingConfig;
  if (stagingConfigExists(slug)) {
    stagingConfig = readStagingConfig(slug);
  } else {
    stagingConfig = await runStagingSetup(slug, clientName);
  }

  const { sshHost, sshUser, wpPath, stagingUrl } = stagingConfig;

  // 3. Site exists locally?
  if (!existsSync(sitePath)) {
    logger.error(`Site directory not found: ${sitePath}`);
    logger.info(`Run \`synced new "${clientName}"\` to create it first.`);
    process.exit(1);
  }

  logger.title(`Pushing ${clientName} → staging`);
  logger.info(`  Staging: ${stagingUrl}`);
  logger.divider();

  // 4. Check WP-CLI on staging
  logger.step('Checking WP-CLI on staging server...');
  try {
    await checkRemoteWpCli(sshHost, sshUser);
    logger.success('WP-CLI found on staging.');
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // 5. Backup: export current staging DB first
  const backupDir = ensureBackupDir(slug);
  const stagingBackupFile = `staging-${timestamp()}.sql`;
  const stagingBackupPath = join(backupDir, stagingBackupFile);
  const remoteStagingBackup = `/tmp/synced-${slug}-staging-backup.sql`;

  logger.step('Backing up staging database...');
  try {
    await sshRun(
      sshHost, sshUser,
      `wp db export ${remoteStagingBackup} --path=${wpPath} --allow-root`
    );
    await scpFrom(sshHost, sshUser, remoteStagingBackup, stagingBackupPath);
    await sshRun(sshHost, sshUser, `rm -f ${remoteStagingBackup}`, { stdio: 'pipe' });
    logger.success(`Staging DB backed up → ~/.synced/backups/${slug}/${stagingBackupFile}`);
  } catch (err) {
    logger.error(`Staging backup failed: ${err.message}`);
    process.exit(1);
  }

  // 6. Export local SQLite DB
  const localSqlFile = `/tmp/synced-${slug}-push.sql`;

  logger.step('Exporting local database...');
  try {
    await execa(wpBin, [
      'db', 'export', localSqlFile,
      `--path=${sitePath}`,
      '--allow-root',
    ], { stdio: 'inherit' });
    logger.success('Local DB exported.');
  } catch (err) {
    logger.error(`Local DB export failed: ${err.message}`);
    process.exit(1);
  }

  // 7. SCP SQL file to staging
  const remotePushSql = `/tmp/synced-${slug}-push.sql`;

  logger.step('Uploading SQL to staging server...');
  try {
    await scpTo(sshHost, sshUser, localSqlFile, remotePushSql);
    logger.success('SQL file uploaded.');
  } catch (err) {
    logger.error(`SCP failed: ${err.message}`);
    process.exit(1);
  }

  // 8. Import on staging
  logger.step('Importing database on staging...');
  try {
    await sshRun(
      sshHost, sshUser,
      `wp db import ${remotePushSql} --path=${wpPath} --allow-root`
    );
    logger.success('Database imported on staging.');
  } catch (err) {
    logger.error(`DB import failed: ${err.message}`);
    process.exit(1);
  }

  // 9. URL search-replace on staging
  // Resolve local port from running.json; fallback 8881
  const running = getSiteRunning(slug);
  const localPort = running?.port ?? 8881;
  const localUrl = `http://localhost:${localPort}`;

  logger.step(`Replacing URLs on staging: ${localUrl} → ${stagingUrl}`);
  try {
    await sshRun(
      sshHost, sshUser,
      `wp search-replace '${localUrl}' '${stagingUrl}' --path=${wpPath} --allow-root`
    );
    logger.success('URLs replaced on staging.');
  } catch (err) {
    logger.error(`URL search-replace failed: ${err.message}`);
    process.exit(1);
  }

  // 10. Rsync media (optional)
  const syncMedia = options.media !== false;
  if (syncMedia) {
    const localUploads = join(sitePath, 'wp-content', 'uploads') + '/';
    const remoteUploads = `${wpPath}/wp-content/uploads/`;

    logger.step('Syncing media files to staging...');
    try {
      await rsyncTo(sshHost, sshUser, localUploads, remoteUploads);
      logger.success('Media files synced.');
    } catch (err) {
      logger.warn(`Media sync failed (non-fatal): ${err.message}`);
    }
  } else {
    logger.info('Media sync skipped (--no-media).');
  }

  // 11. Cleanup temp files
  logger.step('Cleaning up temp files...');
  try {
    await execa('rm', ['-f', localSqlFile], { stdio: 'pipe' });
    await sshRun(sshHost, sshUser, `rm -f ${remotePushSql}`, { stdio: 'pipe' });
  } catch {
    // Non-fatal
  }

  // 12. Success summary
  logger.blank();
  logger.divider();
  logger.success(`${clientName} pushed to staging!`);
  logger.blank();
  logger.info(`  Staging URL:   ${stagingUrl}`);
  logger.info(`  DB backup:     ~/.synced/backups/${slug}/${stagingBackupFile}`);
  if (!syncMedia) logger.info('  Media:         skipped');
  logger.divider();
}
