import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SleepSoundscape - Ambient Sound Mixer',
  description: 'Create your perfect ambient mix for sleep, focus, and relaxation',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
