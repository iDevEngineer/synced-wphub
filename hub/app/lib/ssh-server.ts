// Server-side SSH helpers (thin re-export of CLI lib ssh.js functions)
// Using execa directly to avoid ESM/CJS interop issues
import { execa } from 'execa';

export async function sshRun(host: string, user: string, command: string, options?: { stdio?: string }): Promise<void> {
  await execa('ssh', [`${user}@${host}`, command], {
    stdio: (options?.stdio as 'inherit' | 'pipe' | 'ignore') ?? 'inherit',
  });
}

export async function scpTo(host: string, user: string, localPath: string, remotePath: string): Promise<void> {
  await execa('scp', [localPath, `${user}@${host}:${remotePath}`]);
}

export async function scpFrom(host: string, user: string, remotePath: string, localPath: string): Promise<void> {
  await execa('scp', [`${user}@${host}:${remotePath}`, localPath]);
}

export async function rsyncTo(host: string, user: string, localPath: string, remotePath: string): Promise<void> {
  await execa('rsync', ['-avz', '--delete', '-e', 'ssh', localPath, `${user}@${host}:${remotePath}`]);
}

export async function rsyncFrom(host: string, user: string, remotePath: string, localPath: string): Promise<void> {
  await execa('rsync', ['-avz', '--delete', '-e', 'ssh', `${user}@${host}:${remotePath}`, localPath]);
}
