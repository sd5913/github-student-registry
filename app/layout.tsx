import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] });
// `metadataBase` runs at module scope, so a malformed value throws before any
// request is handled and takes down every route. Metadata is presentational,
// so recover instead: assume HTTPS when the scheme is missing, and drop the
// absolute URLs entirely if the value still will not parse.
function resolveSiteUrl(value: string | undefined): URL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    return undefined;
  }
}

const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const metadata: Metadata = {
  title: 'GitHub Student Registry · SD5913',
  description: 'Connect your GitHub account to your SD5913 student ID.',
  metadataBase: siteUrl,
  openGraph: { title: 'GitHub Student Registry · SD5913', description: 'Connect your GitHub account to your SD5913 student ID.', type: 'website', images: siteUrl ? [{ url: '/og.png', width: 1731, height: 909, alt: 'GitHub Student Registry · SD5913' }] : undefined },
  twitter: { card: 'summary_large_image', title: 'GitHub Student Registry · SD5913', description: 'Connect your GitHub account to your SD5913 student ID.', images: siteUrl ? ['/og.png'] : undefined },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${inter.variable} ${mono.variable}`}>{children}</body></html>;
}
