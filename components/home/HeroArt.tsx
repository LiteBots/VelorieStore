'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '../Icon';

/** Prawa strona hero — animacja izometryczna 1:1 z projektu źródłowego (canvas + szklane karty). */
export function HeroArt() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    let draw: ((c: HTMLCanvasElement) => void) | null = null;
    const paint = () => requestAnimationFrame(() => { if (alive && draw && ref.current) draw(ref.current); });
    import('@/lib/art/engine').then((m: any) => {
      draw = m.drawHeroCanvas;
      paint();
    });
    const onResize = () => { clearTimeout(t); t = setTimeout(paint, 200); };
    window.addEventListener('resize', onResize);
    return () => { alive = false; clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-ring" />
      <canvas ref={ref} />
      <div className="glass g1">
        <div className="row">
          <span className="dot" style={{ background: 'rgba(52,211,153,.14)', color: 'var(--ok)' }}><Icon name="key" /></span>
          <div><b>Licencja aktywna</b><span className="mono">VLR-7Q2M-K9XD-44PA</span></div>
        </div>
      </div>
      <div className="glass g2">
        <div className="row">
          <div><b>velorie_mdt</b><span className="mono">resmon <span style={{ color: 'var(--ok)' }}>0.00 ms</span></span></div>
          <div className="bars">{[6, 9, 5, 8, 4, 7, 5].map((h, i) => <i key={i} style={{ height: h * 2.4 }} />)}</div>
        </div>
      </div>
      <div className="glass g3">
        <div className="row">
          <span className="dot" style={{ background: 'rgba(47,107,255,.2)', color: 'var(--ice)' }}><Icon name="wallet" /></span>
          <div><b>Nowa sprzedaż +118,15 zł</b><span className="mono">MRPD Rework · licencja Pro</span></div>
        </div>
      </div>
      <div className="glass g4"><span className="mono" style={{ color: 'var(--fg)' }}>Paper 1.21.4 · ESX · QBox</span></div>
    </div>
  );
}
