'use client';

import { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle } from 'lucide-react';

interface Props {
  slug: string;
}

export default function ImportExportPanel({ slug }: Props) {
  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/sites/${slug}/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Export failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-export.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (!file.name.endsWith('.sql')) {
      setImportError('Please select a .sql file.');
      return;
    }
    setSelectedFile(file);
    setImportError(null);
    setImportSuccess(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleFileChange(file);
  }

  async function handleImportConfirm() {
    if (!selectedFile) return;
    setShowImportConfirm(false);
    setImporting(true);
    setImportError(null);
    setImportSuccess(false);
    try {
      const formData = new FormData();
      formData.append('sql', selectedFile);
      const res = await fetch(`/api/sites/${slug}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Import failed.');
      }
      setImportSuccess(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Export section */}
      <section>
        <h2 className="text-muted" style={{
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          Export database
        </h2>
        <div className="bg-card border border-border" style={{ borderRadius: '8px', padding: '20px' }}>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Download your local database as a SQL file.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-border text-text"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.5 : 1,
            }}
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export database'}
          </button>
          {exportError && (
            <p className="text-red-400" style={{ fontSize: '13px', marginTop: '10px' }}>{exportError}</p>
          )}
        </div>
      </section>

      {/* Import section */}
      <section>
        <h2 className="text-muted" style={{
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          Import database
        </h2>
        <div className="bg-card border border-border" style={{ borderRadius: '8px', padding: '20px' }}>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Restore from a SQL file. This will overwrite your local database.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '8px',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragOver ? 'rgba(224, 90, 43, 0.05)' : 'transparent',
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
          >
            <Upload size={24} className="text-stopped" style={{ margin: '0 auto 10px' }} />
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '4px' }}>
              Drag and drop a <code className="text-text">.sql</code> file here
            </p>
            <p className="text-stopped" style={{ fontSize: '12px' }}>or click to browse</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {selectedFile && (
            <div
              className="bg-bg border border-border"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              <span className="text-text" style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </span>
              <span className="text-stopped" style={{ fontSize: '12px', flexShrink: 0 }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => setShowImportConfirm(true)}
                disabled={importing}
                className="bg-accent text-white"
                style={{
                  border: 'none',
                  borderRadius: '5px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  opacity: importing ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}

          {importSuccess && (
            <p className="text-green-400" style={{ fontSize: '13px', marginTop: '8px' }}>
              Database imported successfully.
            </p>
          )}
          {importError && (
            <p className="text-red-400" style={{ fontSize: '13px', marginTop: '8px' }}>{importError}</p>
          )}
        </div>
      </section>

      {/* Import confirm modal */}
      {showImportConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          style={{ zIndex: 50 }}
        >
          <div
            className="bg-surface border border-border"
            style={{
              borderRadius: '10px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              margin: '0 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p className="text-text" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Overwrite local database?
                </p>
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  This will overwrite your local database. This cannot be undone. Continue?
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleImportConfirm}
                className="bg-accent text-white"
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Yes, import
              </button>
              <button
                onClick={() => setShowImportConfirm(false)}
                className="bg-border text-text"
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
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
