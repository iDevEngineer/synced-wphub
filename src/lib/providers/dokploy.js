import { logger } from '../../utils/logger.js';
import { deploy as genericDeploy } from './generic.js';

/**
 * Dokploy adapter — SSH deploy + Dokploy API redeploy trigger.
 *
 * 1. Run generic SSH deploy first
 * 2. If config.dokployAppId and config.dokployToken set:
 *    POST to config.dokployUrl/api/application.deploy
 */
export async function deploy(config, sitePath, slug) {
  // Step 1: generic SSH deploy
  await genericDeploy(config, sitePath, slug);

  // Step 2: trigger Dokploy redeploy if configured
  if (config.dokployAppId && config.dokployToken && config.dokployUrl) {
    logger.step('Triggering Dokploy redeploy...');
    try {
      const url = `${config.dokployUrl.replace(/\/$/, '')}/api/application.deploy`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.dokployToken}`,
        },
        body: JSON.stringify({ applicationId: config.dokployAppId }),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.warn(`Dokploy redeploy returned ${response.status}: ${text} (non-fatal)`);
      } else {
        logger.success('Dokploy redeploy triggered.');
      }
    } catch (err) {
      logger.warn(`Dokploy API call failed (non-fatal): ${err.message}`);
    }
  } else {
    logger.info('Dokploy API credentials not set — skipping redeploy trigger.');
  }
}
