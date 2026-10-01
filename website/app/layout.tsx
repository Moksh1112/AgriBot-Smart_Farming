import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

// The Flutter app renders in SF Pro on iPhone (system font) and Roboto on Android; match both.
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700', '900'], variable: '--font-roboto', display: 'swap' });

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to your domain so social previews use absolute image URLs.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agribot-site.onrender.com'),
  title: 'AgriBot — The field robot that spots crop disease first',
  description: 'AgriBot drives your rows, spots tomato leaf disease with on-board AI, probes the soil and tells you what to do — before the problem spreads.',
  openGraph: {
    title: 'AgriBot — smart farming robot',
    description: 'On-board crop-disease vision, soil sensors and instant alerts on your phone.',
    images: ['/screens/02-field.jpg'],
  },
};

export const viewport: Viewport = { themeColor: '#f1f3ee' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
