import { readConfig, getSitePath } from '../lib/config.js';
import { getSiteRunning, unregisterSite } from '../lib/sites.js';
import { killWpNow } from '../lib/wordpress.js';
import { logger } from '../utils/logger.js';

/**
 * synced stop "Client Name"
 *
 * Stops a running local WordPress site.
 */
export async function stopCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced stop "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // 1. Check running.json
  const entry = getSiteRunning(slug);
  if (!entry) {
    logger.error(`${clientName} is not currently running.`);
    process.exit(1);
  }

  // 2. Kill process on the port (reliable for detached wp-now)
  logger.step(`Stopping ${clientName} on port ${entry.port}...`);
  await killWpNow(entry.port);

  // 3. Unregister from running.json
  unregisterSite(slug);

  // 4. Success
  logger.success(`${clientName} stopped.`);
}
