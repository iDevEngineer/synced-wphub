import { logger } from '../../utils/logger.js';
import { deploy as genericDeploy } from './generic.js';

const KINSTA_API_BASE = 'https://api.kinsta.com/v2';

/**
 * Kinsta adapter.
 *
 * 1. Generic SSH rsync to Kinsta staging
 * 2. If config.kinstaApiKey and config.kinstaSiteId:
 *    POST to https://api.kinsta.com/v2/sites/<id>/tools/clear-cache
 */
export async function deploy(config, sitePath, slug) {
  // Step 1: generic SSH deploy
  await genericDeploy(config, sitePath, slug);

  // Step 2: Kinsta cache clear via API
  if (config.kinstaApiKey && config.kinstaSiteId) {
    logger.step('Clearing Kinsta cache via API...');
    try {
      const url = `${KINSTA_API_BASE}/sites/${config.kinstaSiteId}/tools/clear-cache`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.kinstaApiKey}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        logger.warn(`Kinsta cache clear returned ${response.status}: ${text} (non-fatal)`);
      } else {
        logger.success('Kinsta cache cleared via API.');
      }
    } catch (err) {
      logger.warn(`Kinsta API call failed (non-fatal): ${err.message}`);
    }
  } else {
    logger.info('Kinsta API credentials not set — skipping cache clear via API.');
  }
}
