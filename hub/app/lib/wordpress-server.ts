// Server-side wrapper for wordpress lib functions
import 'server-only';
import { execa } from 'execa';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { homedir } from 'os';

interface SiteConfig {
  phpVersion?: string;
  wpVersion?: string;
  wpDebug?: boolean;
  wpDebugLog?: boolean;
  wpDebugDisplay?: boolean;
}

function readSiteConfig(slug: string): SiteConfig {
  try {
    return JSON.parse(readFileSync(join(homedir(), '.synced', 'sites', `${slug}.json`), 'utf-8'));
  } catch { return {}; }
}

function generateBlueprint(config: SiteConfig, existingBlueprintPath?: string): string | null {
  const consts: Record<string, boolean> = {};
  if (config.wpDebug) consts['WP_DEBUG'] = true;
  if (config.wpDebugLog) consts['WP_DEBUG_LOG'] = true;
  if (config.wpDebugDisplay) consts['WP_DEBUG_DISPLAY'] = true;

  if (Object.keys(consts).length === 0 && !existingBlueprintPath) return null;

  // Merge with existing blueprint if present
  let blueprint: { steps: unknown[] } = { steps: [] };
  if (existingBlueprintPath && existsSync(existingBlueprintPath)) {
    try { blueprint = JSON.parse(readFileSync(existingBlueprintPath, 'utf-8')); }
    catch { /* ignore */ }
  }

  if (Object.keys(consts).length > 0) {
    // Remove any existing defineWpConfigConsts step
    blueprint.steps = (blueprint.steps ?? []).filter(
      (s: unknown) => (s as { step?: string }).step !== 'defineWpConfigConsts'
    );
    blueprint.steps.push({ step: 'defineWpConfigConsts', consts });
  }

  const tmpPath = join(homedir(), '.synced', 'tmp');
  mkdirSync(tmpPath, { recursive: true });
  const bpPath = join(tmpPath, `blueprint-${Date.now()}.json`);
  writeFileSync(bpPath, JSON.stringify(blueprint, null, 2));
  return bpPath;
}

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

  const slug = sitePath.split('/').pop()?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'unknown';
  const siteConfig = readSiteConfig(slug);

  const wpNowBin = getWpNowBin();
  const args = ['start', `--path=${sitePath}`, `--port=${port}`, '--skip-browser'];

  // PHP version
  if (siteConfig.phpVersion) {
    args.push(`--php=${siteConfig.phpVersion}`);
  }

  // WordPress version
  if (siteConfig.wpVersion) {
    args.push(`--wp=${siteConfig.wpVersion}`);
  }

  // Blueprint — debug constants and/or existing blueprint
  const generatedBp = generateBlueprint(siteConfig, blueprintPath);
  if (generatedBp) {
    args.push(`--blueprint=${generatedBp}`);
  } else if (blueprintPath && existsSync(blueprintPath)) {
    args.push(`--blueprint=${blueprintPath}`);
  }

  // Set up log file for this site
  const logsDir = join(homedir(), '.synced', 'logs');
  mkdirSync(logsDir, { recursive: true });
  const logPath = join(logsDir, `${slug}.log`);

  // Use shell redirection for logging so the child is fully detached
  const cmd = wpNowBin
    ? `node ${wpNowBin} ${args.join(' ')} >> "${logPath}" 2>&1`
    : `npx @wp-now/wp-now ${args.join(' ')} >> "${logPath}" 2>&1`;

  const proc = execa('sh', ['-c', cmd], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });

  proc.unref();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return `http://localhost:${port}`;
}
