'use client';

import { useState } from 'react';
import { deleteSite } from '@/lib/api';

interface Props {
  slug: string;
  siteName: string;
  onDeleted: () => void;
  onClose: () => void;
}

export default function DeleteSiteModal({ slug, siteName, onDeleted, onClose }: Props) {
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteSite(slug, deleteFiles);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete site.');
        setLoading(false);
        return;
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60"
      style={{ zIndex: 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface border border-border"
        style={{
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          className="text-text"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Delete site
        </h2>

        <p
          className="text-muted"
          style={{
            fontSize: '14px',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}
        >
          This will remove <strong className="text-text">{siteName}</strong> from Synced.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#d1d5db',
            marginBottom: '24px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px', cursor: 'pointer' }}
          />
          Also delete local files
        </label>

        {error && (
          <p
            className="text-red-400"
            style={{
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            className="bg-border text-text"
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-white"
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#dc2626',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting...' : 'Delete site'}
          </button>
        </div>
      </div>
    </div>
  );
}
