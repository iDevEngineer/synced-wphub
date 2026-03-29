/**
 * mysql.js — MySQL instance management per site
 *
 * Stub for Phase 1. wp-now handles its own SQLite/MySQL internally,
 * so this module is a placeholder for future per-site MySQL management
 * (e.g. custom MySQL containers, db import/export, credential management).
 */

import { logger } from '../utils/logger.js';

/**
 * Provision a MySQL instance for a site (stub)
 */
export async function provisionDatabase(siteName) {
  logger.info(`[mysql] Database provisioning for "${siteName}" — stub (wp-now handles this).`);
  return { host: 'localhost', name: siteName, stub: true };
}

/**
 * Drop a MySQL instance for a site (stub)
 */
export async function dropDatabase(siteName) {
  logger.info(`[mysql] Database teardown for "${siteName}" — stub.`);
}

/**
 * Export a MySQL database (stub)
 */
export async function exportDatabase(siteName, outputPath) {
  logger.info(`[mysql] Export for "${siteName}" to ${outputPath} — stub.`);
}
