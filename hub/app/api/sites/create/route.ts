import { NextRequest } from 'next/server';
import path from 'path';

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return new Response(
      JSON.stringify({ error: 'Site name is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const siteName = name.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: 'log', message: `Creating site "${siteName}"...` });

        // Find synced CLI bin — hub/ lives one level inside the repo root
        const cliPath = path.join(process.cwd(), '..', 'bin', 'synced.js');
        const repoCwd = path.join(process.cwd(), '..');

        send({ type: 'log', message: `Running: node ${cliPath} new "${siteName}"` });

        // Dynamic import of execa to keep ESM compat
        const { execa } = await import('execa');

        const proc = execa('node', [cliPath, 'new', siteName], {
          cwd: repoCwd,
          all: true,
        });

        proc.all?.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          lines.forEach((line) => send({ type: 'log', message: line }));
        });

        await proc;

        // Auto-start the site after creation
        send({ type: 'log', message: 'Starting site...' });
        try {
          const startProc = execa('node', [cliPath, 'start', siteName], {
            cwd: repoCwd,
            all: true,
          });
          startProc.all?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n').filter(Boolean);
            lines.forEach((line) => send({ type: 'log', message: line }));
          });
          await startProc;
        } catch {
          send({ type: 'log', message: 'Site created. Start it manually from the dashboard.' });
        }

        send({ type: 'done', message: 'Site created and running.' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create site.';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
