import { execa } from 'execa';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Curated list of skills to install — not all 14, just the most relevant
const WP_SKILLS = [
  'wordpress-router',
  'wp-project-triage',
  'wp-block-development',
  'wp-block-themes',
  'wp-plugin-development',
  'wp-wpcli-and-ops',
];

export async function installWordPressSkills(sitePath) {
  const tmpRepo = join(tmpdir(), 'wp-agent-skills-' + Date.now());

  try {
    // 1. Clone the repo shallowly (fast)
    await execa('git', [
      'clone',
      '--depth=1',
      '--quiet',
      'https://github.com/WordPress/agent-skills.git',
      tmpRepo,
    ]);

    // 2. Build the skill pack
    await execa('node', ['shared/scripts/skillpack-build.mjs', '--clean'], {
      cwd: tmpRepo,
    });

    // 3. Install to site — targets: claude, cursor, codex
    await execa('node', [
      'shared/scripts/skillpack-install.mjs',
      `--dest=${sitePath}`,
      '--targets=claude,cursor,codex',
      `--skills=${WP_SKILLS.join(',')}`,
    ], {
      cwd: tmpRepo,
    });

    return true;
  } finally {
    // Always clean up temp clone
    try {
      rmSync(tmpRepo, { recursive: true, force: true });
    } catch { /* non-fatal */ }
  }
}
