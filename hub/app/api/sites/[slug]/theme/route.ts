import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

function getConfig() {
  try { return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8')); }
  catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findThemePath(sitePath: string): string | null {
  const themesDir = path.join(sitePath, 'wp-content', 'themes');
  if (!existsSync(themesDir)) return null;
  const themes = readdirSync(themesDir).filter(
    t => !['twentytwentyone', 'twentytwentytwo', 'twentytwentythree', 'twentytwentyfour', 'twentytwentyfive', 'index.php'].includes(t)
  );
  return themes.length > 0 ? path.join(themesDir, themes[0]) : null;
}

function readColours(themePath: string) {
  const cssPath = path.join(themePath, 'assets', 'src', 'css', 'variables.css');
  const defaults = { primary: '#ffffff', secondary: '#1a1a1a', accent: '#6366f1' };
  if (!existsSync(cssPath)) return defaults;

  const content = readFileSync(cssPath, 'utf-8');
  const primary = content.match(/--color-primary:\s*([^;]+);/)?.[1]?.trim() ?? defaults.primary;
  const secondary = content.match(/--color-secondary:\s*([^;]+);/)?.[1]?.trim() ?? defaults.secondary;
  const accent = content.match(/--color-accent:\s*([^;]+);/)?.[1]?.trim() ?? defaults.accent;

  return { primary, secondary, accent };
}

function writeColours(themePath: string, colours: { primary: string; secondary: string; accent: string }) {
  const cssDir = path.join(themePath, 'assets', 'src', 'css');
  mkdirSync(cssDir, { recursive: true });
  const cssPath = path.join(cssDir, 'variables.css');

  const { primary, secondary, accent } = colours;
  const themeBlock = `@theme {\n  --color-primary: ${primary};\n  --color-secondary: ${secondary};\n  --color-accent: ${accent};\n}`;

  let content = '';
  if (existsSync(cssPath)) {
    content = readFileSync(cssPath, 'utf-8');
    if (content.includes('@theme')) {
      content = content
        .replace(/--color-primary:\s*[^;]+;/, `--color-primary: ${primary};`)
        .replace(/--color-secondary:\s*[^;]+;/, `--color-secondary: ${secondary};`)
        .replace(/--color-accent:\s*[^;]+;/, `--color-accent: ${accent};`);
    } else {
      content = themeBlock + '\n\n' + content;
    }
  } else {
    content = themeBlock + '\n';
  }

  writeFileSync(cssPath, content, 'utf-8');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;
    const sitePath = path.join(sitesPath, match);

    const themePath = findThemePath(sitePath);
    if (!themePath) {
      return Response.json({ colours: null, error: 'No custom theme found' });
    }

    const colours = readColours(themePath);
    return Response.json({ colours, themeName: path.basename(themePath) });
  } catch {
    return Response.json({ colours: null });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;
    const sitePath = path.join(sitesPath, match);

    const themePath = findThemePath(sitePath);
    if (!themePath) {
      return Response.json({ error: 'No custom theme found' }, { status: 404 });
    }

    writeColours(themePath, {
      primary: body.primary ?? '#ffffff',
      secondary: body.secondary ?? '#1a1a1a',
      accent: body.accent ?? '#6366f1',
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
