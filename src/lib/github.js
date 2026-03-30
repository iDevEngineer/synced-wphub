import { Octokit } from '@octokit/rest';
import { execa } from 'execa';
import { logger } from '../utils/logger.js';

/**
 * Get a GitHub token from the environment or gh CLI.
 * Devs are expected to have GitHub configured — we don't store tokens ourselves.
 */
async function getToken() {
  // 1. Try GH_TOKEN / GITHUB_TOKEN env var
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  // 2. Try gh CLI
  try {
    const { stdout } = await execa('gh', ['auth', 'token']);
    const token = stdout.trim();
    if (token) return token;
  } catch {
    // gh not installed or not authenticated
  }

  return null;
}

/**
 * Create an Octokit instance using system credentials.
 */
async function getOctokit() {
  const token = await getToken();
  if (!token) {
    throw new Error(
      'GitHub authentication not found.\n' +
      'Either:\n' +
      '  • Run: gh auth login\n' +
      '  • Or set GH_TOKEN environment variable'
    );
  }
  return new Octokit({ auth: token });
}

/**
 * Get the authenticated GitHub user
 */
export async function getGitHubUser() {
  const octokit = await getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

/**
 * Create a private GitHub repository
 */
export async function createRepo(repoName, description = '') {
  const octokit = await getOctokit();

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

    logger.step('Pushing to GitHub...');
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
