'use client';

import { useState } from 'react';
import { zl } from '@/lib/catalog';

export function EarningsCalc() {
  const [price, setPrice] = useState(79);
  const [sales, setSales] = useState(60);
  const v = price * sales;
  const pct = (val: number, min: number, max: number) => ({ ['--p' as any]: `${((val - min) / (max - min)) * 100}%` });
  return (
    <>
      <span className="eyebrow">Kalkulator zarobków</span>
      <h3 style={{ fontSize: 22, marginTop: 12 }}>Ile zarobisz na Velorie?</h3>
      <div className="range-row">
        <label htmlFor="cPrice">Cena produktu <b>{zl(price)}</b></label>
        <input id="cPrice" type="range" min={10} max={400} value={price} style={pct(price, 10, 400)} onChange={(e) => setPrice(+e.target.value)} />
      </div>
      <div className="range-row">
        <label htmlFor="cSales">Sprzedaży miesięcznie <b>{sales}</b></label>
        <input id="cSales" type="range" min={1} max={400} value={sales} style={pct(sales, 1, 400)} onChange={(e) => setSales(+e.target.value)} />
      </div>
      <div className="calc-out">
        <div><small>Twój zarobek miesięcznie</small><span className="big-num grad">{zl(Math.round(v * 0.85))}</span></div>
        <div style={{ textAlign: 'right' }}><small>Rocznie</small><b className="tnum" style={{ fontSize: 20 }}>{zl(Math.round(v * 0.85 * 12))}</b></div>
      </div>
      <div className="split"><i style={{ width: '85%' }} /></div>
      <div className="split-l"><span>Ty · 85%</span><span>Velorie · {zl(Math.round(v * 0.15))}</span></div>
    </>
  );
}
