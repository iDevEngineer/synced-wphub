import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getSiteConfigPath(slug: string) {
  return path.join(homedir(), '.synced', 'sites', `${slug}.json`);
}

function readSiteConfig(slug: string) {
  const p = getSiteConfigPath(slug);
  try { return JSON.parse(readFileSync(p, 'utf-8')); }
  catch { return {}; }
}

function writeSiteConfig(slug: string, config: Record<string, unknown>) {
  const dir = path.join(homedir(), '.synced', 'sites');
  mkdirSync(dir, { recursive: true });
  writeFileSync(getSiteConfigPath(slug), JSON.stringify(config, null, 2));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const config = readSiteConfig(slug);
  return Response.json({
    phpVersion: config.phpVersion ?? null,
    wpVersion: config.wpVersion ?? null,
    wpDebug: config.wpDebug ?? false,
    wpDebugLog: config.wpDebugLog ?? false,
    wpDebugDisplay: config.wpDebugDisplay ?? false,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const existing = readSiteConfig(slug);

  const updated = {
    ...existing,
    ...(body.phpVersion !== undefined && { phpVersion: body.phpVersion }),
    ...(body.wpVersion !== undefined && { wpVersion: body.wpVersion }),
    ...(body.wpDebug !== undefined && { wpDebug: body.wpDebug }),
    ...(body.wpDebugLog !== undefined && { wpDebugLog: body.wpDebugLog }),
    ...(body.wpDebugDisplay !== undefined && { wpDebugDisplay: body.wpDebugDisplay }),
    ...(body.name !== undefined && { name: body.name }),
  };

  writeSiteConfig(slug, updated);

  return Response.json({ success: true, config: updated, restartRequired: true });
}
