import type { Metadata } from 'next';
import { loadProducts, loadSellers } from '@/lib/products';
import { ShopClient } from '@/components/ShopClient';
import { PLATS, type Plat } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sklep — pluginy, skrypty, mapy i interiory',
  description: 'Pełny katalog Velorie Market: pluginy Minecraft (Paper, Folia, Velocity), skrypty FiveM (ESX, QBCore, QBox), interiory MLO, mapy, pojazdy, boty Discord i strony serwerów.',
  alternates: { canonical: '/sklep' },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const plat = typeof sp.plat === 'string' && sp.plat in PLATS ? sp.plat : undefined;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 80) : undefined;
  const [products, sellers] = await Promise.all([loadProducts(), loadSellers()]);
  return (
    <ShopClient
      products={products}
      sellers={sellers}
      init={{ plat, q }}
      title={plat ? PLATS[plat as Plat] : 'Wszystkie produkty'}
    />
  );
}
