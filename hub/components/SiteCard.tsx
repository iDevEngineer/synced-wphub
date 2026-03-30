'use client';

import type { Site } from '@/lib/api';

interface Props {
  site: Site;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function SiteCard({ site, isSelected, onClick }: Props) {
  const isRunning = site.status === 'running';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg p-4 border transition-colors"
      style={{
        backgroundColor: isSelected ? 'rgba(224, 90, 43, 0.08)' : '#2b2f33',
        borderColor: isSelected ? '#e05a2b' : '#3d4147',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: '#f9fafb' }}>
          {site.name}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: isRunning ? 'rgba(224, 90, 43, 0.15)' : 'rgba(107, 114, 128, 0.15)',
            color: isRunning ? '#e05a2b' : '#6b7280',
          }}
        >
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>
      {isRunning && site.url && (
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: '#9ca3af' }}
          onClick={(e) => e.stopPropagation()}
        >
          {site.url}
        </a>
      )}
    </div>
  );
}
