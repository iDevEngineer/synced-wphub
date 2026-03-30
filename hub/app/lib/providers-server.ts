// Provider resolver - dynamically imports from CLI lib
// Uses dynamic import to handle the ESM parent package
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

interface Provider {
  deploy: (config: Record<string, unknown>, sitePath: string, slug: string) => Promise<void>;
}

export async function getProvider(providerName: string): Promise<Provider> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const providersDir = path.resolve(__dirname, '../../../../src/lib/providers');

  const providers: Record<string, string> = {
    generic: path.join(providersDir, 'generic.js'),
    wpengine: path.join(providersDir, 'wpengine.js'),
    kinsta: path.join(providersDir, 'kinsta.js'),
    dokploy: path.join(providersDir, 'dokploy.js'),
  };

  const providerPath = providers[providerName];
  if (!providerPath) {
    throw new Error(`Unknown provider: "${providerName}". Valid options: ${Object.keys(providers).join(', ')}`);
  }

  const mod = await import(providerPath);
  return mod as Provider;
}
