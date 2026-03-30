import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execa } from 'execa';

import { readConfig, getSitePath } from '../lib/config.js';
import { readStagingConfig, stagingConfigExists } from '../lib/staging.js';
import { getSiteRunning } from '../lib/sites.js';
import { sshRun, scpFrom, rsyncFrom } from '../lib/ssh.js';
import { logger } from '../utils/logger.js';
import { confirm } from '../utils/prompt.js';

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
 * synced pull <clientName>
 *
 * Pull staging database and media files to local.
 *
 * @param {string} clientName
 * @param {{ media: boolean }} options
 */
export async function pullCommand(clientName, options = {}) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced pull "Client Name"');
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

  // 2. Staging config — must exist; pull requires prior setup
  if (!stagingConfigExists(slug)) {
    logger.error(`No staging config found for "${clientName}".`);
    logger.info('Run `synced deploy` or `synced push` first to set up staging.');
    process.exit(1);
  }

  const stagingConfig = readStagingConfig(slug);
  const { sshHost, sshUser, wpPath, stagingUrl } = stagingConfig;

  // 3. Site exists locally?
  if (!existsSync(sitePath)) {
    logger.error(`Site directory not found: ${sitePath}`);
    logger.info(`Run \`synced new "${clientName}"\` to create it first.`);
    process.exit(1);
  }

  logger.title(`Pulling ${clientName} ← staging`);
  logger.info(`  Staging: ${stagingUrl}`);
  logger.divider();

  // 4. Destructive warning — confirm before proceeding
  logger.warn('This will overwrite your local database with the staging database.');
  const ok = await confirm('Continue?', false);
  if (!ok) {
    logger.info('Pull cancelled.');
    process.exit(0);
  }

  // 5. Backup local DB first
  const backupDir = ensureBackupDir(slug);
  const localBackupFile = `local-${timestamp()}.sql`;
  const localBackupPath = join(backupDir, localBackupFile);

  logger.step('Backing up local database...');
  try {
    await execa(wpBin, [
      'db', 'export', localBackupPath,
      `--path=${sitePath}`,
      '--allow-root',
    ], { stdio: 'inherit' });
    logger.success(`Local DB backed up → ~/.synced/backups/${slug}/${localBackupFile}`);
  } catch (err) {
    logger.error(`Local DB backup failed: ${err.message}`);
    process.exit(1);
  }

  // 6. Export staging DB via SSH
  const remotePullSql = `/tmp/synced-${slug}-pull.sql`;

  logger.step('Exporting staging database...');
  try {
    await sshRun(
      sshHost, sshUser,
      `wp db export ${remotePullSql} --path=${wpPath} --allow-root`
    );
    logger.success('Staging DB exported.');
  } catch (err) {
    logger.error(`Staging DB export failed: ${err.message}`);
    process.exit(1);
  }

  // 7. SCP SQL file locally
  const localPullSql = `/tmp/synced-${slug}-pull.sql`;

  logger.step('Downloading SQL from staging...');
  try {
    await scpFrom(sshHost, sshUser, remotePullSql, localPullSql);
    logger.success('SQL file downloaded.');
  } catch (err) {
    logger.error(`SCP download failed: ${err.message}`);
    process.exit(1);
  }

  // 8. Import into local SQLite
  logger.step('Importing database locally...');
  try {
    await execa(wpBin, [
      'db', 'import', localPullSql,
      `--path=${sitePath}`,
      '--allow-root',
    ], { stdio: 'inherit' });
    logger.success('Database imported locally.');
  } catch (err) {
    logger.error(`Local DB import failed: ${err.message}`);
    process.exit(1);
  }

  // 9. URL search-replace locally
  // Resolve local port from running.json; fallback 8881
  const running = getSiteRunning(slug);
  const localPort = running?.port ?? 8881;
  const localUrl = `http://localhost:${localPort}`;

  logger.step(`Replacing URLs locally: ${stagingUrl} → ${localUrl}`);
  try {
    await execa(wpBin, [
      'search-replace', stagingUrl, localUrl,
      `--path=${sitePath}`,
      '--allow-root',
    ], { stdio: 'inherit' });
    logger.success('URLs replaced locally.');
  } catch (err) {
    logger.error(`URL search-replace failed: ${err.message}`);
    process.exit(1);
  }

  // 10. Rsync media down (optional)
  const syncMedia = options.media !== false;
  if (syncMedia) {
    const remoteUploads = `${wpPath}/wp-content/uploads/`;
    const localUploads = join(sitePath, 'wp-content', 'uploads') + '/';

    logger.step('Syncing media files from staging...');
    try {
      await rsyncFrom(sshHost, sshUser, remoteUploads, localUploads);
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
    await execa('rm', ['-f', localPullSql], { stdio: 'pipe' });
    await sshRun(sshHost, sshUser, `rm -f ${remotePullSql}`, { stdio: 'pipe' });
  } catch {
    // Non-fatal
  }

  // 12. Success summary
  logger.blank();
  logger.divider();
  logger.success(`${clientName} pulled from staging!`);
  logger.blank();
  logger.info(`  Local URL:     http://localhost:${localPort}`);
  logger.info(`  DB backup:     ~/.synced/backups/${slug}/${localBackupFile}`);
  if (!syncMedia) logger.info('  Media:         skipped');
  logger.divider();
}
