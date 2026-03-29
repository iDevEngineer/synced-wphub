import { Octokit } from '@octokit/rest';
import { execa } from 'execa';
import { logger } from '../utils/logger.js';

/**
 * Create an Octokit instance from config
 */
function getOctokit(config) {
  if (!config.github?.connected || !config.github?.token) {
    throw new Error('GitHub is not connected. Run `synced setup` to configure it.');
  }
  return new Octokit({ auth: config.github.token });
}

/**
 * Get the authenticated GitHub user
 */
export async function getGitHubUser(config) {
  const octokit = getOctokit(config);
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

/**
 * Create a private GitHub repository
 */
export async function createRepo(config, repoName, description = '') {
  const octokit = getOctokit(config);

  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: true,
      auto_init: false,
    });
    return data;
  } catch (err) {
    if (err.status === 422) {
      throw new Error(`Repository "${repoName}" already exists on GitHub.`);
    }
    throw new Error(`Failed to create GitHub repo: ${err.message}`);
  }
}

/**
 * Initialise git, add remote, commit and push
 */
export async function initAndPush(sitePath, repoUrl) {
  const opts = { cwd: sitePath };

  try {
    logger.step('Initialising git repository...');
    await execa('git', ['init'], opts);

    await execa('git', ['add', '.'], opts);
    await execa('git', ['commit', '-m', 'feat: initial commit — synced new'], opts);

    logger.step('Adding GitHub remote and pushing...');
    await execa('git', ['remote', 'add', 'origin', repoUrl], opts);
    await execa('git', ['branch', '-M', 'main'], opts);
    await execa('git', ['push', '-u', 'origin', 'main'], opts);

    logger.success('Pushed to GitHub.');
  } catch (err) {
    throw new Error(`Git operation failed: ${err.message}`);
  }
}

/**
 * Commit and push changes (for existing repos)
 */
export async function commitAndPush(sitePath, message) {
  const opts = { cwd: sitePath };

  try {
    await execa('git', ['add', '.'], opts);
    await execa('git', ['commit', '-m', message], opts);
    await execa('git', ['push'], opts);
    logger.success('Changes pushed to GitHub.');
  } catch (err) {
    throw new Error(`Git push failed: ${err.message}`);
  }
}
