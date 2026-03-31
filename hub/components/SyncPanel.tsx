'use client';

import { useState } from 'react';
import { pushSite, pullSite, type StagingConfig } from '@/lib/api';

interface Props {
  slug: string;
  staging: StagingConfig | null;
}

export default function SyncPanel({ slug, staging }: Props) {
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const [pullLoading, setPullLoading] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);
  const [showPullConfirm, setShowPullConfirm] = useState(false);

  async function handlePush() {
    setPushLoading(true);
    setPushMessage(null);
    setPushError(null);
    try {
      const result = await pushSite(slug);
      setPushMessage(result.message ?? 'Local database pushed to staging.');
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Push failed.');
    } finally {
      setPushLoading(false);
    }
  }

  function handlePullClick() {
    setShowPullConfirm(true);
  }

  async function handlePullConfirm() {
    setShowPullConfirm(false);
    setPullLoading(true);
    setPullMessage(null);
    setPullError(null);
    try {
      const result = await pullSite(slug);
      setPullMessage(result.message ?? 'Staging database pulled to local.');
    } catch (err) {
      setPullError(err instanceof Error ? err.message : 'Pull failed.');
    } finally {
      setPullLoading(false);
    }
  }

  if (!staging) {
    return (
      <div>
        <h2 className="text-base font-semibold mb-3 text-text">
          Sync
        </h2>
        <p className="text-sm text-muted">
          No hosting provider configured. Add one in Settings to enable deploy, push, and pull.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-6">
        {/* Push */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-text">
            Push to staging
          </h3>
          <p className="text-xs mb-3 text-muted">
            Copies your local database to staging. Remote data will be overwritten.
          </p>
          <button
            onClick={handlePush}
            disabled={pushLoading}
            className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 bg-border text-text"
          >
            {pushLoading ? 'Pushing...' : 'Push to staging'}
          </button>
          {pushMessage && (
            <p className="text-xs mt-2 text-green-400">
              {pushMessage}
            </p>
          )}
          {pushError && (
            <p className="text-xs mt-2 text-red-400">
              {pushError}
            </p>
          )}
        </div>

        {/* Pull */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-text">
            Pull from staging
          </h3>
          <p className="text-xs mb-3 text-muted">
            Copies the staging database to local. Local data will be overwritten.
          </p>
          <button
            onClick={handlePullClick}
            disabled={pullLoading}
            className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 bg-border text-text"
          >
            {pullLoading ? 'Pulling...' : 'Pull from staging'}
          </button>
          {pullMessage && (
            <p className="text-xs mt-2 text-green-400">
              {pullMessage}
            </p>
          )}
          {pullError && (
            <p className="text-xs mt-2 text-red-400">
              {pullError}
            </p>
          )}
        </div>
      </div>

      {/* Pull confirm modal */}
      {showPullConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          style={{ zIndex: 50 }}
        >
          <div
            className="rounded-lg p-6 max-w-sm w-full mx-4 border bg-surface border-border"
          >
            <p className="text-sm mb-6 text-text">
              This will overwrite your local database with staging data. This cannot be undone. Continue?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePullConfirm}
                className="flex-1 px-4 py-2 rounded text-sm font-medium bg-accent text-white"
              >
                Yes, overwrite local
              </button>
              <button
                onClick={() => setShowPullConfirm(false)}
                className="flex-1 px-4 py-2 rounded text-sm font-medium bg-border text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
