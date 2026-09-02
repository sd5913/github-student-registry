import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  title: 'GitHub Student Registry · SD5913',
  description: 'Connect your GitHub account to your SD5913 student ID.',
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  openGraph: { title: 'GitHub Student Registry · SD5913', description: 'Connect your GitHub account to your SD5913 student ID.', type: 'website', images: siteUrl ? [{ url: '/og.png', width: 1731, height: 909, alt: 'GitHub Student Registry · SD5913' }] : undefined },
  twitter: { card: 'summary_large_image', title: 'GitHub Student Registry · SD5913', description: 'Connect your GitHub account to your SD5913 student ID.', images: siteUrl ? ['/og.png'] : undefined },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${inter.variable} ${mono.variable}`}>{children}</body></html>;
}
