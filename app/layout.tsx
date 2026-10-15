import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@/styles/globals.css';
import { Providers } from '@/components/Providers';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { CookieBanner } from '@/components/CookieBanner';
import { Announce } from '@/components/FooterBits';
import { JsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/site';
import { loadProducts } from '@/lib/products';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — pluginy Minecraft, skrypty FiveM, mapy i MLO`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  keywords: SITE.keywords,
  applicationName: SITE.name,
  authors: [{ name: SITE.company.name }],
  creator: SITE.name,
  publisher: SITE.company.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — buduj serwery bez kompromisów`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', site: SITE.twitter, title: SITE.name, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: false },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#04060b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await loadProducts();
  const featured = products.find((p) => p.slug === 'velomdt') || products[0] || null;

  return (
    <html lang="pl">
      <body>
        <a href="#main" className="skip">Przejdź do treści</a>
        <div className="ambient" aria-hidden="true" />
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: SITE.name,
              url: SITE.url,
              logo: `${SITE.url}/brand/logo-512.png`,
              email: SITE.company.email,
              sameAs: [SITE.discordInvite],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: SITE.name,
              url: SITE.url,
              inLanguage: 'pl-PL',
              potentialAction: { '@type': 'SearchAction', target: `${SITE.url}/sklep?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
            },
          ]}
        />
        <Providers>
          <Announce />
          <Nav featured={featured} />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <CommandPalette />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
