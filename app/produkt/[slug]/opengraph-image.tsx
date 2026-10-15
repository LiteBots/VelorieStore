import { ImageResponse } from 'next/og';
import { OgFrame } from '@/components/OgFrame';
import { ogLogo } from '@/lib/og-logo';
import { loadProduct } from '@/lib/products';
import { PLATS, catOf, zl } from '@/lib/catalog';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Produkt w Velorie Market';

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, logo] = await Promise.all([loadProduct(slug), ogLogo()]);
  if (!p) return new ImageResponse(<OgFrame logo={logo} tag="VELORIE MARKET" title="Produkt" sub="" />, size);
  return new ImageResponse(
    <OgFrame logo={logo} tag={`${PLATS[p.plat].toUpperCase()} · ${catOf(p.cat).full.toUpperCase()}`} title={p.name} sub={p.desc} price={`od ${zl(p.price)}`} />,
    size,
  );
}
