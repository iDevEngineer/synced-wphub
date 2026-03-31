import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import { execa } from 'execa';

interface Params {
  params: Promise<{ slug: string }>;
}

function resolveWpBin(): string {
  const localWp = join(homedir(), '.local', 'bin', 'wp');
  return existsSync(localWp) ? localWp : 'wp';
}

export async function POST(req: Request, { params }: Params) {
  let tempFile: string | null = null;

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

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get('sql');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No SQL file provided.' }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write to temp file
    tempFile = join(tmpdir(), `synced-import-${slug}-${Date.now()}.sql`);
    writeFileSync(tempFile, buffer);

    const wpBin = resolveWpBin();

    // Run wp db import
    await execa(wpBin, ['db', 'import', tempFile, `--path=${sitePath}`, '--allow-root'], {
      stdio: 'pipe',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Clean up temp file
    if (tempFile) {
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
}
