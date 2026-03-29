import { execa } from 'execa';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const SYNCED_THEME_REPO = 'https://github.com/iDevEngineer/synced-wptheme';

/**
 * Clone the synced-wptheme starter into the given directory.
 */
export async function cloneStarterTheme(targetPath) {
  logger.step(`Installing Synced WP theme into ${targetPath}...`);

  try {
    await execa('git', ['clone', '--depth=1', SYNCED_THEME_REPO, targetPath]);
    // Remove .git so the theme is not a submodule of the site repo
    await execa('rm', ['-rf', join(targetPath, '.git')]);
    logger.success('Synced WP theme installed.');
  } catch (err) {
    throw new Error(`Failed to install theme: ${err.message}`);
  }
}

/**
 * Rename the generic "synced-wptheme" placeholders with the client's name.
 * Updates style.css, functions.php, and package.json.
 *
 * Replacements:
 *   Synced WP Theme  → Client Name   (title case)
 *   synced-wptheme   → client-name   (kebab-case slug)
 */
export function renameThemePlaceholders(themePath, clientName) {
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const titleCase = clientName;

  const filesToUpdate = [
    join(themePath, 'style.css'),
    join(themePath, 'functions.php'),
    join(themePath, 'package.json'),
  ];

  for (const filePath of filesToUpdate) {
    if (!existsSync(filePath)) {
      logger.warn(`File not found, skipping: ${filePath}`);
      continue;
    }

    let content = readFileSync(filePath, 'utf8');
    content = content.replaceAll('Synced WP Theme', titleCase);
    content = content.replaceAll('synced-wptheme', slug);
    writeFileSync(filePath, content, 'utf8');
    logger.step(`Updated ${filePath.split('/').pop()}`);
  }
}

/**
 * Apply brand colours to CSS custom properties in assets/src/css/variables.css.
 * Updates --color-primary, --color-secondary, --color-accent inside @theme block.
 */
export function applyBrandColours(themePath, colours) {
  const cssPath = join(themePath, 'assets', 'src', 'css', 'variables.css');

  const { primary = '#ffffff', secondary = '#1a1a1a', accent = '#6366f1' } = colours;

  let content;

  if (existsSync(cssPath)) {
    content = readFileSync(cssPath, 'utf8');
  } else {
    logger.warn(`variables.css not found — creating with colour variables.`);
    content = '';
  }

  // Replace existing colour values inside @theme block, or append
  const themeBlock = `@theme {\n  --color-primary: ${primary};\n  --color-secondary: ${secondary};\n  --color-accent: ${accent};\n}`;

  if (content.includes('@theme')) {
    content = content
      .replace(/--color-primary:\s*[^;]+;/, `--color-primary: ${primary};`)
      .replace(/--color-secondary:\s*[^;]+;/, `--color-secondary: ${secondary};`)
      .replace(/--color-accent:\s*[^;]+;/, `--color-accent: ${accent};`);
  } else {
    content = themeBlock + '\n\n' + content;
  }

  const dir = join(themePath, 'assets', 'src', 'css');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(cssPath, content, 'utf8');
  logger.success('Brand colours applied.');
}
