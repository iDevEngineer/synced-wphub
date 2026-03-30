import * as generic from './generic.js';
import * as wpengine from './wpengine.js';
import * as kinsta from './kinsta.js';
import * as dokploy from './dokploy.js';

const PROVIDERS = {
  generic,
  wpengine,
  kinsta,
  dokploy,
};

/**
 * Get a provider module by name.
 * Throws if the provider is not recognised.
 *
 * @param {string} providerName - 'generic' | 'wpengine' | 'kinsta' | 'dokploy'
 * @returns {{ deploy: Function }}
 */
export function getProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(
      `Unknown provider: "${providerName}". Valid options: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }
  return provider;
}
