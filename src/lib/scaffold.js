/**
 * scaffold.js — AI scaffolding helpers
 *
 * Generates theme configuration from a brief using AI (Claude, ChatGPT, etc.).
 * Phase 1 stub — the AI integration wiring is left for Phase 2.
 * The public API is defined here so commands can call it without changes later.
 */

import { logger } from '../utils/logger.js';

/**
 * Generate theme config suggestions from a brief string.
 * In Phase 2 this will call the configured AI provider.
 *
 * @param {string} brief     - Client brief / description
 * @param {string} aiProvider - 'claude' | 'chatgpt' | 'other' | null
 * @returns {object} Suggested theme config (colours, fonts, etc.)
 */
export async function generateThemeConfig(brief, aiProvider) {
  if (!aiProvider || aiProvider === 'skip') {
    logger.info('AI scaffolding skipped (no provider configured).');
    return null;
  }

  // Phase 1 stub — return a placeholder to indicate where Phase 2 hooks in
  logger.info(`[scaffold] AI scaffolding stub — provider: ${aiProvider}`);
  logger.warn('AI theme generation will be implemented in Phase 2.');

  return {
    stub: true,
    provider: aiProvider,
    brief,
    suggestion: null,
  };
}
