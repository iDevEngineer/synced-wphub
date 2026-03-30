import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '../../lib/config-server';

export async function GET() {
  try {
    const config = readConfig();
    return NextResponse.json({ config: config ?? {} });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    writeConfig(body);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
