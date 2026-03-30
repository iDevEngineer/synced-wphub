import { execa } from 'execa';

/**
 * Standard SSH options — key-based auth only, fail fast on host key prompts.
 */
const SSH_OPTS = [
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'BatchMode=yes',
];

/**
 * Wrap execa SSH errors with a clearer message when BatchMode fails
 * (i.e. key auth not set up).
 */
function handleSshError(err, host, user) {
  const msg = err.stderr || err.message || '';
  if (
    msg.includes('Permission denied') ||
    msg.includes('publickey') ||
    msg.includes('BatchMode') ||
    msg.includes('Host key verification failed')
  ) {
    throw new Error(
      `SSH key auth failed for ${user}@${host}.\n` +
      `Ensure your public key is authorised on the server:\n` +
      `  ssh-copy-id ${user}@${host}\n` +
      `Original error: ${msg.trim()}`
    );
  }
  throw err;
}

/**
 * Run a command on a remote server via SSH.
 *
 * @param {string} host
 * @param {string} user
 * @param {string} command - shell command to run remotely
 * @param {object} options  - execa options (stdio, etc.)
 */
export async function sshRun(host, user, command, options = {}) {
  try {
    return await execa('ssh', [
      ...SSH_OPTS,
      `${user}@${host}`,
      command,
    ], { stdio: 'inherit', ...options });
  } catch (err) {
    handleSshError(err, host, user);
  }
}

/**
 * Copy a local file to a remote server via SCP.
 *
 * @param {string} host
 * @param {string} user
 * @param {string} localPath
 * @param {string} remotePath
 */
export async function scpTo(host, user, localPath, remotePath) {
  try {
    return await execa('scp', [
      ...SSH_OPTS,
      localPath,
      `${user}@${host}:${remotePath}`,
    ], { stdio: 'inherit' });
  } catch (err) {
    handleSshError(err, host, user);
  }
}

/**
 * Copy a file from a remote server to local via SCP.
 *
 * @param {string} host
 * @param {string} user
 * @param {string} remotePath
 * @param {string} localPath
 */
export async function scpFrom(host, user, remotePath, localPath) {
  try {
    return await execa('scp', [
      ...SSH_OPTS,
      `${user}@${host}:${remotePath}`,
      localPath,
    ], { stdio: 'inherit' });
  } catch (err) {
    handleSshError(err, host, user);
  }
}

/**
 * Rsync a local directory to a remote server.
 *
 * @param {string} host
 * @param {string} user
 * @param {string} localPath  - local source path (trailing slash = contents)
 * @param {string} remotePath - remote destination path
 * @param {object} options    - { delete: bool, exclude: string[] }
 */
export async function rsyncTo(host, user, localPath, remotePath, options = {}) {
  const args = [
    '-az',
    '--progress',
    '-e', `ssh ${SSH_OPTS.join(' ')}`,
  ];

  if (options.delete) args.push('--delete');
  if (options.exclude) {
    for (const pattern of [].concat(options.exclude)) {
      args.push('--exclude', pattern);
    }
  }

  args.push(localPath, `${user}@${host}:${remotePath}`);

  try {
    return await execa('rsync', args, { stdio: 'inherit' });
  } catch (err) {
    handleSshError(err, host, user);
  }
}

/**
 * Rsync a remote directory to local.
 *
 * @param {string} host
 * @param {string} user
 * @param {string} remotePath - remote source path (trailing slash = contents)
 * @param {string} localPath  - local destination path
 * @param {object} options    - { delete: bool, exclude: string[] }
 */
export async function rsyncFrom(host, user, remotePath, localPath, options = {}) {
  const args = [
    '-az',
    '--progress',
    '-e', `ssh ${SSH_OPTS.join(' ')}`,
  ];

  if (options.delete) args.push('--delete');
  if (options.exclude) {
    for (const pattern of [].concat(options.exclude)) {
      args.push('--exclude', pattern);
    }
  }

  args.push(`${user}@${host}:${remotePath}`, localPath);

  try {
    return await execa('rsync', args, { stdio: 'inherit' });
  } catch (err) {
    handleSshError(err, host, user);
  }
}
