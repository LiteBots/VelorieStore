'use client';

import { useEffect, useState } from 'react';

export interface ArtInput {
  id: string;
  art: string;
  plat: string;
  name?: string;
  version?: string;
  compat?: string;
  feats?: string[];
  imageUrl?: string | null;
}

/** Grafika produktu: własny obraz (imageUrl) albo render izometryczny z silnika Velorie. */
export function ProductArt({ p, v = 0, w = 800, h = 500, alt = '' }: { p: ArtInput; v?: number; w?: number; h?: number; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const custom = p.imageUrl && v === 0 ? p.imageUrl : null;

  useEffect(() => {
    if (custom) return;
    let alive = true;
    const run = () => {
      import('@/lib/art/engine').then((m: any) => {
        if (alive) setSrc(m.art(p, v, w, h));
      });
    };
    const fonts = (document as any).fonts;
    const go = () => {
      const ric = (window as any).requestIdleCallback;
      if (ric) ric(run, { timeout: 500 });
      else setTimeout(run, 0);
    };
    if (fonts?.ready) fonts.ready.then(go);
    else go();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id, p.art, p.name, p.version, v, w, h, custom]);

  if (custom) return <img src={custom} alt={alt} loading="lazy" decoding="async" />;
  return src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <div className="art-ph" aria-hidden="true" />;
}
