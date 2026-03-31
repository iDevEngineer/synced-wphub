import { execa } from 'execa';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Install all available WordPress agent-skills — they're gitignored so no repo bloat
const WP_SKILLS = [];

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

    // 3. Install all skills to site — targets: claude, cursor, codex
    await execa('node', [
      'shared/scripts/skillpack-install.mjs',
      `--dest=${sitePath}`,
      '--targets=claude,cursor,codex',
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
