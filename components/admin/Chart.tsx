'use client';

import { useRef, useState } from 'react';
import { zl } from '@/lib/catalog';

export interface Point { label: string; value: number; count: number }

/** Wykres liniowy przychodu dziennego (styl z oryginalnego panelu twórcy). */
export function RevenueChart({ data }: { data: Point[] }) {
  const W = 680, H = 240, pl = 48, pr = 12, pt = 14, pb = 28;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(10, ...data.map((d) => d.value));
  const mx = Math.ceil(top / 5 / 10) * 10 * 5 || 50;
  const x = (i: number) => pl + (i * (W - pl - pr)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - pb - (v / mx) * (H - pt - pb);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const ticks = [0, 1, 2, 3, 4, 5].map((k) => (mx / 5) * k);
  const labelIdx = data.length > 5 ? [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1] : data.map((_, i) => i);
  const last = data.length - 1;
  const h = hover ?? last;

  const move = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(last, Math.round((px - pl) / ((W - pl - pr) / Math.max(1, last))))));
  };
  const total = data.reduce((a, d) => a + d.value, 0);

  if (!data.length) return <div className="empty">Brak danych</div>;
  return (
    <div className="chart">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Przychód z ${data.length} dni: łącznie ${zl(total)}`} onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2f6bff" stopOpacity=".4" /><stop offset="1" stopColor="#2f6bff" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="#141d31" />
            <text x={pl - 8} y={y(t) + 3.5} fill="#56617f" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono Variable, monospace">{Math.round(t)}</text>
          </g>
        ))}
        {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 8} fill="#56617f" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono Variable, monospace">{data[i].label}</text>)}
        <path d={`${line}L${x(last)},${H - pb}L${pl},${H - pb}Z`} fill="url(#cg)" />
        <path d={line} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(h)} x2={x(h)} y1={pt} y2={H - pb} stroke="#26375c" strokeDasharray="3 3" />}
        <circle r="5" fill="#8fdcff" stroke="#04060b" strokeWidth="2" cx={x(h)} cy={y(data[h].value)} />
      </svg>
      <div className="tip" style={{ opacity: hover !== null ? 1 : 0, left: `${(x(h) / W) * 100}%`, top: `${(y(data[h].value) / H) * 100}%` }}>
        <span className="muted">{data[h].label}</span>
        <b>{zl(data[h].value)} · {data[h].count} szt.</b>
      </div>
    </div>
  );
}
