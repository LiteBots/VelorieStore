'use client';

import { useMemo, useState } from 'react';
import type { ProductDTO, SellerDTO } from '@/lib/types';
import { ProductCard } from '../ProductCard';

const TABS = [['best', 'Bestsellery'], ['new', 'Nowości'], ['mc', 'Minecraft'], ['fivem', 'FiveM']] as const;

export function HomeProducts({ products, sellers }: { products: ProductDTO[]; sellers: Record<string, SellerDTO> }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('best');
  const list = useMemo(() => {
    const by = (a: ProductDTO, b: ProductDTO) => b.sales - a.sales;
    if (tab === 'new') return [...products].sort((a, b) => b.updated.localeCompare(a.updated));
    if (tab === 'mc') return products.filter((p) => p.plat === 'minecraft').sort(by);
    if (tab === 'fivem') return products.filter((p) => p.plat === 'fivem').sort(by);
    return [...products].sort(by);
  }, [tab, products]);

  return (
    <>
      <div className="sec-head">
        <div><span className="eyebrow">Popularne teraz</span><h2>Najchętniej kupowane</h2></div>
        <div className="seg" role="tablist">
          {TABS.map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid">
        {list.slice(0, 8).map((p) => <ProductCard key={p.slug} p={p} seller={sellers[p.seller]} />)}
      </div>
    </>
  );
}
