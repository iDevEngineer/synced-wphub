// synced hub — starts the Next.js Hub UI and opens the browser
import { execa } from 'execa';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function hubCommand() {
  const hubDir = path.join(__dirname, '../../hub');
  const port = 3000;
  const url = `http://localhost:${port}`;

  // Check hub directory exists
  if (!existsSync(hubDir)) {
    console.error(`Hub directory not found: ${hubDir}`);
    console.error('Run `npm install` in the hub directory to set it up.');
    process.exit(1);
  }

  // Check node_modules exists (hub has been installed)
  if (!existsSync(path.join(hubDir, 'node_modules'))) {
    console.error('Hub dependencies not installed. Run `npm install` in the hub/ directory first.');
    process.exit(1);
  }

  // Check if a built .next dir exists; if not, try dev mode instead
  const isBuilt = existsSync(path.join(hubDir, '.next', 'standalone')) ||
    existsSync(path.join(hubDir, '.next', 'server'));

  console.log(`Synced running at ${url}`);

  const command = isBuilt ? 'next' : 'next';
  const args = isBuilt
    ? ['start', '-p', String(port)]
    : ['dev', '-p', String(port)];

  // Open browser after a short delay
  setTimeout(() => {
    open(url).catch(() => {});
  }, 1500);

  // Start the Next.js server (foreground — keeps the process alive)
  try {
    await execa(command, args, {
      cwd: hubDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(port),
      },
    });
  } catch (err) {
    // Try via npx if next isn't in PATH
    await execa('npx', ['next', ...args], {
      cwd: hubDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(port),
      },
    });
  }
}
