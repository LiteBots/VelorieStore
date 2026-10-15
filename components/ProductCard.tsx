'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { catOf, num, plural, zl } from '@/lib/catalog';
import type { ProductDTO, SellerDTO } from '@/lib/types';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { useStore } from './Store';

export function Badge({ b }: { b: string }) {
  if (b === 'bestseller') return <span className="pill blue">Bestseller</span>;
  if (b === 'nowość') return <span className="pill cyan">Nowość</span>;
  if (b === 'promocja') return <span className="pill ok">Promocja</span>;
  return null;
}

export function SellerAv({ s, className = '' }: { s?: SellerDTO; className?: string }) {
  return (
    <span className={`av ${className}`} style={{ background: s?.color || '#26375c' }}>
      {(s?.name || '?')[0]}
    </span>
  );
}

export function ProductCard({ p, seller, list, preview }: { p: ProductDTO; seller?: SellerDTO; list?: boolean; preview?: boolean }) {
  const router = useRouter();
  const { add, wish, toggleWish } = useStore();
  const c = catOf(p.cat);
  const liked = wish.includes(p.slug);
  const href = `/produkt/${p.slug}`;

  const open = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (preview) return;
    if ((e.target as HTMLElement).closest('a,button')) return;
    router.push(href);
  };

  return (
    <article
      className={`card spot ${list ? 'list' : ''}`}
      tabIndex={0}
      aria-label={p.name}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(e); }}
    >
      <div className="thumb">
        <ProductArt p={p} alt={`Podgląd: ${p.name}`} />
        <div className="badges">
          <Badge b={p.badge} />
          {p.old ? <span className="pill ok">−{Math.round((1 - p.price / p.old) * 100)}%</span> : null}
        </div>
        {!preview && (
          <button
            className={`heart ${liked ? 'on' : ''}`}
            aria-label={liked ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            aria-pressed={liked}
            onClick={(e) => { e.stopPropagation(); toggleWish(p.slug); }}
          >
            <Icon name="heart" />
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="card-cat"><span>{c.full}</span><span>{p.compat}</span></div>
        <h3>{preview ? p.name : <Link href={href}>{p.name}</Link>}</h3>
        <p className="desc">{p.desc}</p>
        <div className="card-meta">
          <span className="rate"><Icon name="star" />{p.rating.toFixed(1)}</span>
          <span>{num(p.reviews)} {plural(p.reviews, 'opinia', 'opinie', 'opinii')}</span>
          <span>{num(p.sales)} sprzedanych</span>
          {p.resmon ? <span className="mono" style={{ color: 'var(--ok)', fontSize: 11.5 }}>{p.resmon}</span> : null}
        </div>
        <div className="card-foot">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="price">{zl(p.price)}{p.old ? <s>{zl(p.old)}</s> : null}</span>
            <span className="seller">
              <SellerAv s={seller} />
              <span>{seller?.name || p.seller}</span>
              {seller?.official ? <Icon name="ver" /> : null}
            </span>
          </div>
          <button
            className="add"
            disabled={preview}
            aria-label={`Dodaj ${p.name} do koszyka`}
            onClick={(e) => {
              e.stopPropagation();
              add({ slug: p.slug, lic: 'std', name: p.name, price: p.price, art: p.art, plat: p.plat, imageUrl: p.imageUrl });
            }}
          >
            <Icon name="cart" /><span>Dodaj</span>
          </button>
        </div>
      </div>
    </article>
  );
}
