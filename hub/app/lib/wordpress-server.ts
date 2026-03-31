// Server-side wrapper for wordpress lib functions
import 'server-only';
import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

function getWpNowBin(): string | null {
  // Resolve from the parent CLI package
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const require = createRequire(import.meta.url);
  try {
    const pkgPath = require.resolve('@wp-now/wp-now/package.json', {
      paths: [join(__dirname, '../../../../node_modules')],
    });
    const pkgDir = pkgPath.replace('/package.json', '');
    const bin = join(pkgDir, 'wp-now.js');
    if (existsSync(bin)) return bin;
  } catch {
    // fall through
  }
  return null;
}

export async function killWpNow(port: number): Promise<void> {
  try {
    const { stdout } = await execa('lsof', ['-ti', `tcp:${port}`]).catch(() => ({ stdout: '' }));
    const pids = stdout.trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      await execa('kill', ['-9', pid]).catch(() => {});
    }
  } catch {
    // non-fatal
  }
}

export async function startWordPress(sitePath: string, port: number, blueprintPath?: string): Promise<string> {
  await killWpNow(port);

  const wpNowBin = getWpNowBin();
  const args = ['start', `--path=${sitePath}`, `--port=${port}`, '--skip-browser'];
  if (blueprintPath && existsSync(blueprintPath)) {
    args.push(`--blueprint=${blueprintPath}`);
  }

  let proc;
  if (wpNowBin) {
    proc = execa('node', [wpNowBin, ...args], { detached: true, stdio: 'ignore' });
  } else {
    proc = execa('npx', ['@wp-now/wp-now', ...args], { detached: true, stdio: 'ignore' });
  }

  proc.unref();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return `http://localhost:${port}`;
}
