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
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#1a1d20' }}>
      {showBanner && (
        <SetupBanner onDismiss={() => setBannerDismissed(true)} />
      )}
      <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: '#1a1d20' }}>
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
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-sm rounded px-2 py-2 transition-colors w-full"
              style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1d20' }}>
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
