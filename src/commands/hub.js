// synced hub — starts the Next.js Hub UI and opens the browser
// Auto-installs hub dependencies if needed before starting.
import { execa } from 'execa';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function hubCommand() {
  const hubDir = path.join(__dirname, '../../hub');
  const port = 5757;
  const url = `http://localhost:${port}`;

  if (!existsSync(hubDir)) {
    console.error('Hub directory not found. Try re-installing Synced.');
    process.exit(1);
  }

  // Auto-install hub dependencies if node_modules missing
  if (!existsSync(path.join(hubDir, 'node_modules'))) {
    console.log('Installing Hub dependencies...');
    try {
      await execa('npm', ['install', '--prefer-offline'], {
        cwd: hubDir,
        stdio: 'inherit',
      });
    } catch {
      // Try without --prefer-offline
      await execa('npm', ['install'], {
        cwd: hubDir,
        stdio: 'inherit',
      });
    }
    console.log('');
  }

  // Check if a production build exists — BUILD_ID only present after `next build`
  const isBuilt = existsSync(path.join(hubDir, '.next', 'BUILD_ID'));
  const args = isBuilt
    ? ['start', '-p', String(port)]
    : ['dev', '-p', String(port)];

  console.log(`Starting Synced... ${url}`);

  // Open browser after 2s (enough for Next.js to be ready)
  setTimeout(() => {
    open(url).catch(() => {});
  }, 2000);

  // Try next binary directly, fall back to npx
  try {
    await execa('next', args, {
      cwd: hubDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    });
  } catch {
    await execa('npx', ['next', ...args], {
      cwd: hubDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    });
  }
}
