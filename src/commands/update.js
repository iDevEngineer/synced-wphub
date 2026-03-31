import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function updateCommand() {
  const repoRoot = join(__dirname, '../..');

  // Check we're in a git repo
  if (!existsSync(join(repoRoot, '.git'))) {
    logger.error('Not a git repository. Cannot update.');
    process.exit(1);
  }

  logger.title('Synced — Update');
  logger.divider();

  // Get current version
  try {
    const { stdout: currentBranch } = await execa('git', ['branch', '--show-current'], { cwd: repoRoot });
    const { stdout: currentHash } = await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot });
    logger.info(`Current: ${currentBranch} @ ${currentHash}`);
  } catch {
    // non-fatal
  }

  // Pull latest
  logger.step('Pulling latest changes...');
  try {
    const { stdout } = await execa('git', ['pull', 'origin', 'main'], { cwd: repoRoot });
    if (stdout.includes('Already up to date')) {
      logger.success('Already up to date.');
      return;
    }
    logger.success('Updated successfully.');
  } catch (err) {
    logger.error(`Git pull failed: ${err.message}`);
    process.exit(1);
  }

  // Reinstall root deps
  logger.step('Installing CLI dependencies...');
  try {
    await execa('npm', ['install', '--prefer-offline'], { cwd: repoRoot, stdio: 'inherit' });
  } catch {
    await execa('npm', ['install'], { cwd: repoRoot, stdio: 'inherit' });
  }

  // Reinstall hub deps
  const hubDir = join(repoRoot, 'hub');
  if (existsSync(join(hubDir, 'package.json'))) {
    logger.step('Installing Hub dependencies...');
    try {
      await execa('npm', ['install', '--prefer-offline'], { cwd: hubDir, stdio: 'inherit' });
    } catch {
      await execa('npm', ['install'], { cwd: hubDir, stdio: 'inherit' });
    }
  }

  // Re-link globally
  logger.step('Re-linking synced globally...');
  try {
    await execa('npm', ['link'], { cwd: repoRoot, stdio: 'inherit' });
  } catch {
    logger.warn('npm link failed — you may need to run it manually with sudo.');
  }

  // Show new version
  try {
    const { stdout: newHash } = await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot });
    logger.blank();
    logger.success(`Updated to ${newHash}`);
  } catch {
    logger.success('Update complete.');
  }

  logger.divider();
  logger.info('If the Hub is running, restart it to pick up changes.');
}
