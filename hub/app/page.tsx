'use client';

import { useState, useCallback, useEffect } from 'react';
import SiteList from '@/components/SiteList';
import SiteDetail from '@/components/SiteDetail';
import SetupBanner from '@/components/SetupBanner';
import SettingsModal from '@/components/SettingsModal';
import { Settings } from 'lucide-react';
import { mutate } from 'swr';

export default function HomePage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Revalidates the global sites list when a site start/stop action completes
  const handleStatusChange = useCallback(() => {
    mutate('sites');
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedSlug(null);
    mutate('sites');
  }, []);

  useEffect(() => {
    fetch('/api/setup/status')
      .then((r) => r.json())
      .then((data: { configured: boolean }) => setConfigured(data.configured))
      .catch(() => setConfigured(true)); // fail open — don't block on errors
  }, []);

  const showBanner = configured === false && !bannerDismissed;

  return (
    <div className="flex flex-col h-screen bg-bg">
      {showBanner && (
        <SetupBanner onDismiss={() => setBannerDismissed(true)} />
      )}
      <div className="flex flex-1 overflow-hidden bg-bg">
        {/* Sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-r bg-surface border-border"
          style={{ width: '280px' }}
        >
          <div className="flex items-center px-5 py-4 border-b border-border">
            <span className="text-lg font-semibold tracking-tight text-text">
              Synced
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <SiteList selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
          </div>

          <div className="border-t border-border px-4 py-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-sm rounded px-2 py-2 transition-colors w-full text-muted"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto bg-bg">
          {selectedSlug ? (
            <SiteDetail slug={selectedSlug} onStatusChange={handleStatusChange} onDeleted={handleDeleted} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h2 className="text-xl font-semibold mb-2 text-text">
        No sites yet.
      </h2>
      <p className="text-sm max-w-sm text-muted">
        Create your first site to get started. Synced handles the scaffolding, GitHub setup, and
        deployment config automatically.
      </p>
    </div>
  );
}
