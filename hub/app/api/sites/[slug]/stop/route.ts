import { NextResponse } from 'next/server';
import { getSiteRunning, unregisterSite } from '../../../../lib/sites-server';
import { killWpNow } from '../../../../lib/wordpress-server';

interface Params {
  params: { slug: string };
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { slug } = params;

    const entry = getSiteRunning(slug);
    if (!entry) {
      return NextResponse.json({ error: 'Site is not currently running.' }, { status: 400 });
    }

    await killWpNow(entry.port);
    unregisterSite(slug);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
