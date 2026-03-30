'use client';

import useSWR from 'swr';
import { fetchSite, startSite, stopSite } from '@/lib/api';
import { ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import DeployPanel from './DeployPanel';
import SyncPanel from './SyncPanel';

interface Props {
  slug: string;
}

export default function SiteDetail({ slug }: Props) {
  const { data: site, error, isLoading, mutate } = useSWR(
    slug ? `site-${slug}` : null,
    () => fetchSite(slug),
    { refreshInterval: 3000 }
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleStart() {
    setActionLoading(true);
    setActionError(null);
    try {
      await startSite(slug);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start site.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    setActionLoading(true);
    setActionError(null);
    try {
      await stopSite(slug);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to stop site.');
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: '#9ca3af' }}>
          Loading...
        </span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: '#9ca3af' }}>
          Failed to load site.
        </span>
      </div>
    );
  }

  const isRunning = site.status === 'running';

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#f9fafb' }}>
            {site.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isRunning ? '#e05a2b' : '#6b7280' }}
            />
            <span className="text-sm" style={{ color: '#9ca3af' }}>
              {isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        {isRunning ? (
          <button
            onClick={handleStop}
            disabled={actionLoading}
            className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
          >
            {actionLoading ? 'Stopping...' : 'Stop'}
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#e05a2b', color: '#fff' }}
          >
            {actionLoading ? 'Starting...' : 'Start'}
          </button>
        )}

        {isRunning && site.url && (
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
          >
            <ExternalLink size={14} />
            Open in browser
          </a>
        )}
      </div>

      {actionError && (
        <p className="text-sm mb-4" style={{ color: '#f87171' }}>
          {actionError}
        </p>
      )}

      {/* Divider */}
      <div className="border-t mb-6" style={{ borderColor: '#3d4147' }} />

      {/* Deploy */}
      <DeployPanel slug={slug} staging={site.staging} />

      {/* Divider */}
      <div className="border-t my-6" style={{ borderColor: '#3d4147' }} />

      {/* Sync */}
      <SyncPanel slug={slug} staging={site.staging} />

      {/* Divider */}
      <div className="border-t my-6" style={{ borderColor: '#3d4147' }} />

      {/* Settings link */}
      <Link
        href="/settings"
        className="flex items-center gap-2 text-sm"
        style={{ color: '#9ca3af' }}
      >
        <Settings size={14} />
        Site settings
      </Link>
    </div>
  );
}
