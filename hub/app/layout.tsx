import type { Metadata } from 'next';
import './globals.css';
import ThemeApplier from '@/components/ThemeApplier';

export const metadata: Metadata = {
  title: 'Synced',
  description: 'Local WordPress dev. AI-assisted. Deployment included.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-theme="dark" className="h-screen m-0 bg-bg text-text">
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
