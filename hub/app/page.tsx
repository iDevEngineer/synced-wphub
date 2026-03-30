'use client';

import { useState, useCallback } from 'react';
import SiteList from '@/components/SiteList';
import SiteDetail from '@/components/SiteDetail';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { mutate } from 'swr';

export default function HomePage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Revalidates the global sites list when a site start/stop action completes
  const handleStatusChange = useCallback(() => {
    mutate('sites');
  }, []);

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#1a1d20' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 border-r"
        style={{
          width: '280px',
          backgroundColor: '#2b2f33',
          borderColor: '#3d4147',
        }}
      >
        <div className="flex items-center px-5 py-4 border-b" style={{ borderColor: '#3d4147' }}>
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#f9fafb' }}>
            Synced
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SiteList selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
        </div>

        <div className="border-t px-4 py-3" style={{ borderColor: '#3d4147' }}>
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm rounded px-2 py-2 transition-colors"
            style={{ color: '#9ca3af' }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1d20' }}>
        {selectedSlug ? (
          <SiteDetail slug={selectedSlug} onStatusChange={handleStatusChange} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#f9fafb' }}>
        No sites yet.
      </h2>
      <p className="text-sm max-w-sm" style={{ color: '#9ca3af' }}>
        Create your first site to get started. Synced handles the scaffolding, GitHub setup, and
        deployment config automatically.
      </p>
    </div>
  );
}
