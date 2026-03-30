'use client';

import { useState } from 'react';
import { deploySite, type StagingConfig } from '@/lib/api';
import Link from 'next/link';

interface Props {
  slug: string;
  staging: StagingConfig | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  generic: 'Generic',
  wpengine: 'WP Engine',
  kinsta: 'Kinsta',
  dokploy: 'Dokploy',
};

export default function DeployPanel({ slug, staging }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeploy() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await deploySite(slug);
      setMessage(result.message ?? 'Deployed. Cache cleared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-3" style={{ color: '#f9fafb' }}>
        Deploy
      </h2>

      {!staging ? (
        <div>
          <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>
            No hosting provider configured. Add one in Settings to enable deploy, push, and pull.
          </p>
          <Link
            href="/settings"
            className="text-sm underline"
            style={{ color: '#e05a2b' }}
          >
            Settings
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ backgroundColor: '#3d4147', color: '#9ca3af' }}
            >
              {PROVIDER_LABELS[staging.provider] ?? staging.provider}
            </span>
            {staging.stagingUrl && (
              <a
                href={staging.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: '#9ca3af' }}
              >
                {staging.stagingUrl}
              </a>
            )}
          </div>

          <button
            onClick={handleDeploy}
            disabled={loading}
            className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#e05a2b', color: '#fff' }}
          >
            {loading ? 'Deploying...' : 'Deploy'}
          </button>

          {message && (
            <p className="text-sm mt-3" style={{ color: '#34d399' }}>
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm mt-3" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
