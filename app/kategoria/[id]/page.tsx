import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadProducts, loadSellers } from '@/lib/products';
import { ShopClient } from '@/components/ShopClient';
import { CATS, PLATS } from '@/lib/catalog';
import { JsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const INTRO: Record<string, string> = {
  'mc-plugin': 'Pluginy Minecraft na licencji: gildie, skrzynki, antycheat, ekonomia. Paper, Spigot, Folia i Velocity od 1.8 do 1.21.',
  'mc-map': 'Mapy, spawny i lobby do Minecrafta w formacie .schem i gotowych światów — od średniowiecza po futurystyczne huby.',
  'mc-setup': 'Kompletne serwery Minecraft do wdrożenia w jeden wieczór: pluginy, konfiguracja, mapa, rangi i resource pack.',
  'mc-pack': 'Resource packi z modelami 3D, GUI i ikonami rang. Zgodne z ItemsAdder i Oraxen.',
  'fivem-script': 'Skrypty FiveM dla ESX, QBCore i QBox z podanym resmonem: MDT, garaże, HUD-y, napady i prace.',
  'fivem-mlo': 'Interiory MLO z pełnymi kolizjami, portalami i oświetleniem: komisariaty, szpitale, kluby.',
  'fivem-map': 'Mapy YMAP do FiveM: nowe dzielnice, drogi z pathnodes i tory wyścigowe.',
  'fivem-vehicle': 'Pojazdy add-on do FiveM: radiowozy z ELS, handling pod RP i oznakowania.',
  discord: 'Boty Discord do samodzielnego hostowania: tickety, weryfikacja, logi i statystyki.',
  web: 'Strony serwerów z itemshopem, licznikiem graczy i rankingami.',
  gfx: 'Loga, banery i ikony dla serwerów — kompletne pakiety brandingowe.',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = CATS.find((x) => x.id === id);
  if (!c) return {};
  return {
    title: `${c.full} — ${c.sub}`,
    description: INTRO[c.id] || `${c.full} w Velorie Market. ${c.sub}.`,
    alternates: { canonical: `/kategoria/${c.id}` },
    openGraph: { title: `${c.full} · ${SITE.name}`, description: INTRO[c.id] },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = CATS.find((x) => x.id === id);
  if (!c) notFound();
  const [products, sellers] = await Promise.all([loadProducts(), loadSellers()]);
  const inCat = products.filter((p) => p.cat === c.id);
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Start', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: PLATS[c.plat], item: `${SITE.url}/sklep?plat=${c.plat}` },
          { '@type': 'ListItem', position: 3, name: c.full, item: `${SITE.url}/kategoria/${c.id}` },
        ],
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: c.full,
        itemListElement: inCat.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/produkt/${p.slug}`, name: p.name })),
      }} />
      <ShopClient products={products} sellers={sellers} init={{ plat: c.plat, cat: c.id }} title={c.full} intro={INTRO[c.id]} />
    </>
  );
}
