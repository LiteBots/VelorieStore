import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { LicenseChecker } from '@/components/PublicForms';
import { LIC } from '@/lib/catalog';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Licencje — sprawdź klucz i porównaj typy licencji',
  description: 'Sprawdź klucz licencji VLR, zobacz limit serwerów i termin aktualizacji. Porównaj licencje Standard, Pro i Network.',
  alternates: { canonical: '/licencje' },
};

const DESC = ['Dla jednego serwera, który dopiero startuje.', 'Dla serwera z wersją testową i deweloperską.', 'Dla sieci serwerów i zespołów, które modyfikują kod.'];

export default function LicensesPage() {
  return (
    <div className="view wrap">
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>Licencje</span></nav>
        <h1>Sprawdź swoją <span className="grad">licencję</span></h1>
        <p>Wpisz klucz z biblioteki zakupów. Zobaczysz produkt, typ licencji, liczbę przypisanych serwerów i termin aktualizacji.</p>
        <LicenseChecker />
      </div>
      <div className="sec-head" style={{ marginTop: 56 }}>
        <div><span className="eyebrow">Typy licencji</span><h2>Dopasuj licencję do skali serwera</h2><p>Cena Pro i Network to mnożnik ceny Standard ustalonej przez twórcę.</p></div>
      </div>
      <div className="tiers">
        {LIC.map((l, i) => (
          <div key={l.id} className={`tier spot ${i === 1 ? 'feat' : ''}`}>
            {i === 1 && <span className="pill blue pop">Najczęściej wybierana</span>}
            <h3>{l.name}</h3>
            <div className="mult">×{String(l.mult).replace('.', ',')} <small>ceny bazowej</small></div>
            <p className="muted" style={{ fontSize: 14 }}>{DESC[i]}</p>
            <ul>{l.perks.map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul>
          </div>
        ))}
      </div>

      <section className="sec" style={{ paddingBottom: 0 }}>
        <div className="sec-head"><div><span className="eyebrow">Dla developerów</span><h2 style={{ fontSize: 'clamp(26px,3vw,40px)' }}>API weryfikacji licencji</h2><p>Twój plugin, skrypt lub bot sprawdza klucz jednym żądaniem. Odpowiedź jest podpisana HMAC-SHA256 — nie da się jej podrobić lokalnym serwerem.</p></div></div>
        <div className="code">
          <div className="code-h"><span>POST {SITE.url}/api/v1/licenses/verify</span></div>
          <pre>{`{
  "key": "VLR-XXXX-XXXX-XXXX",
  "product": "velomdt",
  "server_id": "opcjonalnie-stały-identyfikator-serwera"
}

→ 200  { "valid": true, "tier": "Pro", "servers": { "used": 2, "max": 3 }, "updates_until": null, "ts": 1760550000 }
→ 403  { "valid": false, "reason": "server_limit" | "revoked" | "wrong_product" }

Nagłówki: X-Velorie-Timestamp, X-Velorie-Signature = HMAC_SHA256(ts + "." + body, LICENSE_SIGNING_SECRET)`}</pre>
        </div>
      </section>
    </div>
  );
}
