'use client';

import useSWR from 'swr';
import { fetchSite, startSite, stopSite } from '@/lib/api';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import DeployPanel from './DeployPanel';
import SyncPanel from './SyncPanel';
import SiteSettingsPanel from './SiteSettingsPanel';
import DeleteSiteModal from './DeleteSiteModal';

type Tab = 'overview' | 'sync' | 'deploy' | 'settings';

interface Props {
  slug: string;
  onStatusChange?: () => void;
  onDeleted?: () => void;
}

export default function SiteDetail({ slug, onStatusChange, onDeleted }: Props) {
  const { data: site, error, isLoading, mutate } = useSWR(
    slug ? `site-${slug}` : null,
    () => fetchSite(slug),
    { refreshInterval: 3000 }
  );

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleStart() {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await startSite(slug);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to start site.');
      } else {
        await mutate();
        onStatusChange?.();
      }
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
      const result = await stopSite(slug);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to stop site.');
      } else {
        await mutate();
        onStatusChange?.();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to stop site.');
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: '#9ca3af' }}>Loading...</span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: '#9ca3af' }}>Failed to load site.</span>
      </div>
    );
  }

  const isRunning = site.status === 'running';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sync', label: 'Sync' },
    { id: 'deploy', label: 'Deploy' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b" style={{ borderColor: '#3d4147' }}>
        <div className="flex items-start justify-between mb-4">
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

          {/* Action buttons top-right */}
          <div className="flex items-center gap-2">
            {isRunning && site.url && (
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
              >
                <ExternalLink size={13} />
                Open site
              </a>
            )}
            {isRunning && (
              <a
                href={`${site.url}/wp-admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
              >
                WP Admin
              </a>
            )}
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
              >
                {actionLoading ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#e05a2b', color: '#fff' }}
              >
                {actionLoading ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-sm mb-3" style={{ color: '#f87171' }}>{actionError}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.id ? '#e05a2b' : 'transparent',
                color: activeTab === tab.id ? '#f9fafb' : '#9ca3af',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Site details
            </h2>
            <div className="space-y-3">
              <DetailRow label="Site name" value={site.name} />
              <DetailRow label="Local URL" value={site.url ?? '—'} isLink={!!site.url} />
              <DetailRow label="Local path" value={site.path ?? '—'} mono />
              <DetailRow label="Status" value={isRunning ? 'Running' : 'Stopped'} />
              {site.staging && (
                <>
                  <DetailRow label="Staging URL" value={site.staging.stagingUrl ?? '—'} isLink={!!site.staging?.stagingUrl} />
                  <DetailRow label="Provider" value={site.staging.provider ?? '—'} />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <SyncPanel slug={slug} staging={site.staging} />
        )}

        {activeTab === 'deploy' && (
          <DeployPanel slug={slug} staging={site.staging} />
        )}

        {activeTab === 'settings' && (
          <>
            <SiteSettingsPanel slug={slug} staging={site.staging} onSaved={() => mutate()} />
            <div className="mt-8 pt-6 border-t" style={{ borderColor: '#3d4147' }}>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm"
                style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
              >
                Delete site
              </button>
            </div>
          </>
        )}
      </div>

      {showDeleteModal && (
        <DeleteSiteModal
          slug={slug}
          siteName={site.name}
          onDeleted={() => {
            setShowDeleteModal(false);
            onDeleted?.();
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  isLink,
  mono,
}: {
  label: string;
  value: string;
  isLink?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 py-2 border-b" style={{ borderColor: '#3d4147' }}>
      <span className="text-sm w-32 flex-shrink-0" style={{ color: '#9ca3af' }}>{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
          style={{ color: '#e05a2b', fontFamily: mono ? 'monospace' : undefined }}
        >
          {value}
        </a>
      ) : (
        <span
          className="text-sm"
          style={{ color: '#f9fafb', fontFamily: mono ? 'monospace' : undefined }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
