import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';

interface Params {
  params: Promise<{ slug: string }>;
}

function resolveWpBin(): string {
  const localWp = join(homedir(), '.local', 'bin', 'wp');
  return existsSync(localWp) ? localWp : 'wp';
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;

    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No Synced config found.' }, { status: 400 });
    }

    const name = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const sitePath = getSitePath(config, name);
    if (!existsSync(sitePath)) {
      return NextResponse.json({ error: `Site directory not found: ${sitePath}` }, { status: 404 });
    }

    const wpBin = resolveWpBin();

    // Export the database to stdout
    const result = await execa(wpBin, ['db', 'export', '-', `--path=${sitePath}`, '--allow-root'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const sql = result.stdout;
    if (!sql) {
      return NextResponse.json({ error: 'Export produced no output.' }, { status: 500 });
    }

    return new Response(sql, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${slug}-export.sql"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
