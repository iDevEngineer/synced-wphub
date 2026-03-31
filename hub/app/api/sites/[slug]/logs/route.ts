import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';

function getConfig() {
  try { return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8')); }
  catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;

    const logPath = path.join(homedir(), '.synced', 'logs', `${toSlug(match)}.log`);

    if (!existsSync(logPath)) {
      return Response.json({ logs: '', size: 0 });
    }

    const stat = statSync(logPath);
    const url = new URL(req.url);
    const tail = parseInt(url.searchParams.get('tail') ?? '200', 10);
    const since = parseInt(url.searchParams.get('since') ?? '0', 10);

    // If file hasn't changed since last check, return empty
    if (since > 0 && stat.mtimeMs <= since) {
      return Response.json({ logs: '', size: stat.size, mtime: stat.mtimeMs });
    }

    // Read last N KB (max 64KB)
    const maxBytes = Math.min(tail * 512, 65536);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = require('fs').openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - start);
    require('fs').readSync(fd, buf, 0, buf.length, start);
    require('fs').closeSync(fd);

    const content = buf.toString('utf-8');
    // Return last N lines
    const lines = content.split('\n').slice(-tail).join('\n');

    return Response.json({ logs: lines, size: stat.size, mtime: stat.mtimeMs });
  } catch {
    return Response.json({ logs: '', size: 0 });
  }
}
