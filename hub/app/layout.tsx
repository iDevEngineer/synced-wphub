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
      <body
        style={{ height: '100vh', margin: 0 }}
        data-theme="dark"
      >
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
