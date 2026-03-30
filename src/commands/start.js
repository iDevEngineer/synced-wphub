import { existsSync } from 'fs';
import { join } from 'path';
import { readConfig, getSitePath } from '../lib/config.js';
import { getNextPort, getSiteRunning, registerSite } from '../lib/sites.js';
import { startWordPress, killWpNow } from '../lib/wordpress.js';
import { logger } from '../utils/logger.js';

/**
 * synced start "Client Name"
 *
 * Starts a local WordPress site using wp-now.
 */
export async function startCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced start "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // 1. Read config
  const config = readConfig();
  if (!config) {
    logger.error('No configuration found. Run `synced setup` first.');
    process.exit(1);
  }

  // 2. Resolve site path
  const sitePath = getSitePath(config, clientName);

  // 3. Check site directory exists
  if (!existsSync(sitePath)) {
    logger.error(`Site directory not found: ${sitePath}`);
    logger.info(`Run \`synced new "${clientName}"\` to create it.`);
    process.exit(1);
  }

  // 4. Check if already running
  const existing = getSiteRunning(slug);
  if (existing) {
    logger.warn(`${clientName} is already running at ${existing.url}`);
    logger.info('Stop it first with: synced stop "' + clientName + '"');
    process.exit(0);
  }

  // 5. Get next available port
  const port = getNextPort();

  // 6. Kill any existing process on that port (safety net)
  await killWpNow(port);

  // 7. Start wp-now
  logger.title(`Starting ${clientName}`);
  logger.divider();

  const blueprintPath = join(sitePath, 'blueprint.json');
  let url;
  try {
    url = await startWordPress(sitePath, port, blueprintPath);
  } catch (err) {
    logger.error(`Failed to start WordPress: ${err.message}`);
    process.exit(1);
  }

  // 8. Register in running.json
  // pid is unreliable for detached wp-now processes, so we store 0
  registerSite(slug, port, 0, url, clientName);

  // 9. Success
  logger.blank();
  logger.success(`${clientName} running at ${url}`);
  logger.divider();
}
