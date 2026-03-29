import { execa } from 'execa';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const BOILED_REPO = 'https://github.com/Hatched-Agency/boiled';

/**
 * Clone the Boiled starter theme into the given directory.
 */
export async function cloneBoiled(targetPath) {
  logger.step(`Cloning Boiled theme into ${targetPath}...`);

  try {
    await execa('git', ['clone', '--depth=1', BOILED_REPO, targetPath]);
    // Remove .git so the theme isn't a submodule of the site repo
    await execa('rm', ['-rf', join(targetPath, '.git')]);
    logger.success('Boiled theme cloned.');
  } catch (err) {
    throw new Error(`Failed to clone Boiled: ${err.message}`);
  }
}

/**
 * Replace Boiled placeholder names with the client's name throughout
 * style.css, functions.php, and package.json.
 *
 * Replacements:
 *   Boiled      → ClientName   (title case)
 *   boiled      → clientname   (lowercase slug)
 */
export function renameBoiledPlaceholders(themePath, clientName) {
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const titleCase = clientName;

  const filesToRename = [
    join(themePath, 'style.css'),
    join(themePath, 'functions.php'),
    join(themePath, 'package.json'),
  ];

  for (const filePath of filesToRename) {
    if (!existsSync(filePath)) {
      logger.warn(`File not found, skipping rename: ${filePath}`);
      continue;
    }

    let content = readFileSync(filePath, 'utf8');
    content = content.replaceAll('Boiled', titleCase);
    content = content.replaceAll('boiled', slug);
    writeFileSync(filePath, content, 'utf8');
    logger.step(`Updated placeholders in ${filePath.split('/').pop()}`);
  }
}

/**
 * Apply brand colours to CSS variables in assets/src/hatched.css.
 * Looks for a :root block with --color-* variables and replaces them.
 */
export function applyBrandColours(themePath, colours) {
  const cssPath = join(themePath, 'assets', 'src', 'hatched.css');

  const { primary = '#ffffff', secondary = '#1a1a1a', accent = '#6366f1' } = colours;

  let content;

  if (existsSync(cssPath)) {
    content = readFileSync(cssPath, 'utf8');
  } else {
    // Create the file with a default :root block if it doesn't exist
    logger.warn(`hatched.css not found — creating with colour variables.`);
    content = '';
  }

  // Replace existing colour variables if they exist, or append a :root block
  const rootBlock = `:root {
  --color-primary: ${primary};
  --color-secondary: ${secondary};
  --color-accent: ${accent};
}`;

  if (content.includes(':root')) {
    // Replace existing --color-primary/secondary/accent values
    content = content
      .replace(/--color-primary:\s*[^;]+;/, `--color-primary: ${primary};`)
      .replace(/--color-secondary:\s*[^;]+;/, `--color-secondary: ${secondary};`)
      .replace(/--color-accent:\s*[^;]+;/, `--color-accent: ${accent};`);
  } else {
    content = rootBlock + '\n\n' + content;
  }

  // Ensure directory exists
  const dir = join(themePath, 'assets', 'src');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(cssPath, content, 'utf8');
  logger.success('Brand colours applied to CSS variables.');
}
