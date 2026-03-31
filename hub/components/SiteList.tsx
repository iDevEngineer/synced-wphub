'use client';

import useSWR from 'swr';
import { fetchSites, type Site } from '@/lib/api';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import CreateSiteModal from './CreateSiteModal';

interface Props {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

export default function SiteList({ selectedSlug, onSelect }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data, error, isLoading, mutate } = useSWR('sites', fetchSites, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  // Auto-select first running site, then first site
  useEffect(() => {
    if (!data || selectedSlug) return;
    const running = data.find((s) => s.status === 'running');
    const first = data[0];
    if (running) onSelect(running.slug);
    else if (first) onSelect(first.slug);
  }, [data, selectedSlug, onSelect]);

  if (isLoading) {
    return (
      <div className="px-4 py-6 text-sm text-muted">
        Loading sites...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-sm text-muted">
        Failed to load sites.
      </div>
    );
  }

  const sites = data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded font-medium transition-colors bg-accent text-white"
        >
          <Plus size={14} />
          Create site
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sites.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium mb-1 text-text">
              No sites yet.
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Create your first site to get started. Synced handles the scaffolding, GitHub setup, and
              deployment config automatically.
            </p>
          </div>
        ) : (
          sites.map((site) => (
            <SiteRow
              key={site.slug}
              site={site}
              isSelected={selectedSlug === site.slug}
              onClick={() => onSelect(site.slug)}
            />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateSiteModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => mutate()}
        />
      )}
    </div>
  );
}

function SiteRow({ site, isSelected, onClick }: { site: Site; isSelected: boolean; onClick: () => void }) {
  const isRunning = site.status === 'running';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-4 py-3 transition-colors',
        isSelected ? 'bg-opacity-20' : 'hover:bg-opacity-10'
      )}
      style={{
        backgroundColor: isSelected ? 'rgba(224, 90, 43, 0.12)' : undefined,
        borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex-shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: isRunning ? 'var(--color-accent)' : 'var(--color-stopped)' }}
        />
        <span className="text-sm font-medium truncate text-text">
          {site.name}
        </span>
      </div>
      {isRunning && site.url && (
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block text-xs mt-1 ml-4 truncate text-accent hover:underline"
        >
          {site.url}
        </a>
      )}
    </button>
  );
}
