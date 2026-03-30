// Client-side API helpers

export interface Site {
  slug: string;
  name: string;
  path: string;
  status: 'running' | 'stopped';
  url: string | null;
  port: number | null;
}

export interface SiteDetail extends Site {
  staging: StagingConfig | null;
}

export interface StagingConfig {
  slug: string;
  provider: string;
  sshHost: string;
  sshUser: string;
  wpPath: string;
  themePath: string;
  stagingUrl: string;
  githubRepo?: string;
}

export interface Config {
  sitesPath?: string;
  wpCliPath?: string;
  github?: string;
  defaultProvider?: string;
}

// Sites

export async function fetchSites(): Promise<Site[]> {
  const res = await fetch('/api/sites');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch sites');
  return data.sites;
}

export async function fetchSite(slug: string): Promise<SiteDetail> {
  const res = await fetch(`/api/sites/${slug}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch site');
  return data;
}

export async function startSite(slug: string): Promise<{ url: string }> {
  const res = await fetch(`/api/sites/${slug}/start`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to start site');
  return data;
}

export async function stopSite(slug: string): Promise<void> {
  const res = await fetch(`/api/sites/${slug}/stop`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to stop site');
}

export async function deploySite(slug: string): Promise<{ message: string }> {
  const res = await fetch(`/api/sites/${slug}/deploy`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to deploy site');
  return data;
}

export async function pushSite(slug: string, media = true): Promise<{ message: string }> {
  const res = await fetch(`/api/sites/${slug}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to push site');
  return data;
}

export async function pullSite(slug: string, media = true): Promise<{ message: string }> {
  const res = await fetch(`/api/sites/${slug}/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to pull site');
  return data;
}

// Config

export async function fetchConfig(): Promise<Config> {
  const res = await fetch('/api/config');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch config');
  return data.config;
}

export async function saveConfig(config: Config): Promise<void> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to save config');
}
