'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-4 text-muted"
          >
            <ArrowLeft size={14} />
            Back to sites
          </Link>
          <h1 className="text-xl font-semibold text-text">
            Settings
          </h1>
        </div>
        <SettingsForm />
      </div>
    </div>
  );
}
