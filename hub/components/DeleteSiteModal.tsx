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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#2b2f33',
          border: '1px solid #3d4147',
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#f9fafb',
            marginBottom: '8px',
          }}
        >
          Delete site
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}
        >
          This will remove <strong style={{ color: '#f9fafb' }}>{siteName}</strong> from Synced.
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
            style={{ accentColor: '#e05a2b', width: '14px', height: '14px', cursor: 'pointer' }}
          />
          Also delete local files
        </label>

        {error && (
          <p
            style={{
              fontSize: '13px',
              color: '#f87171',
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
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#3d4147',
              color: '#f9fafb',
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
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#dc2626',
              color: '#fff',
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
