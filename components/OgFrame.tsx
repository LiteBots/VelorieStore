// Szablon obrazków Open Graph (udostępnianie linków na Discordzie, Facebooku, X).
export function OgFrame({ title, sub, tag, price, logo }: { title: string; sub: string; tag: string; price?: string; logo?: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: '#eef2ff', backgroundColor: '#04060b', backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(47,107,255,.55), rgba(4,6,11,0) 55%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {logo ? <img src={logo} width={72} height={72} alt="" /> : <div style={{ width: 64, height: 64, borderRadius: 18, background: '#2f6bff' }} />}
        <div style={{ fontSize: 34, fontWeight: 800 }}>Velorie</div>
        <div style={{ fontSize: 16, letterSpacing: 4, color: '#38bdf8', border: '1px solid rgba(56,189,248,.4)', padding: '4px 10px', borderRadius: 8 }}>MARKET</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 20, letterSpacing: 5, color: '#38bdf8' }}>{tag}</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -3, maxWidth: 980 }}>{title}</div>
        <div style={{ fontSize: 30, color: '#8590ad', maxWidth: 900 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#c3cce4' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {['BLIK', 'Przelewy24', 'Stripe'].map((x) => (
            <div key={x} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #26375c' }}>{x}</div>
          ))}
        </div>
        {price ? <div style={{ fontSize: 44, fontWeight: 800, color: '#fff' }}>{price}</div> : <div>velorie.market</div>}
      </div>
    </div>
  );
}

