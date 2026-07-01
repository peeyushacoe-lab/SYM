import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYM - Shiksha Yogi Management',
  description: 'Shiksha Yogi Institute ERP',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
