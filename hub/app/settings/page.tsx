'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1d20' }}>
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-4"
            style={{ color: '#9ca3af' }}
          >
            <ArrowLeft size={14} />
            Back to sites
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: '#f9fafb' }}>
            Settings
          </h1>
        </div>
        <SettingsForm />
      </div>
    </div>
  );
}
