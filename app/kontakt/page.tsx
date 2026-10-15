import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { ContactForm } from '@/components/PublicForms';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Skontaktuj się z Velorie Market: pytania przed zakupem, licencje, zwroty i współpraca. Odpowiadamy w ciągu 24 godzin.',
  alternates: { canonical: '/kontakt' },
};

export default function ContactPage() {
  return (
    <div className="view wrap">
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>Kontakt</span></nav>
        <h1>Porozmawiajmy</h1>
        <p>Najszybciej odpowiadamy na Discordzie i w ticketach w panelu klienta. Formularz trafia prosto do naszej skrzynki.</p>
      </div>
      <div className="sell-grid" style={{ paddingBottom: 40 }}>
        <ContactForm />
        <div className="stack">
          <div className="help-card" style={{ marginTop: 0 }}>
            <b style={{ fontSize: 16 }}>Discord — najszybciej</b>
            <span className="muted" style={{ fontSize: 14 }}>Kanał #support, tickety przez bota, ogłoszenia o aktualizacjach.</span>
            <a href={SITE.discordInvite} target="_blank" rel="noopener noreferrer" className="btn btn-discord" style={{ width: 'fit-content' }}><Icon name="discord" />Dołącz do Discorda</a>
          </div>
          <div className="panel stack">
            <b>Masz już zakup?</b>
            <span className="muted" style={{ fontSize: 14 }}>Załóż ticket w panelu — od razu widzimy Twoje licencje i zamówienia.</span>
            <Link href="/panel/tickety" className="btn btn-ghost" style={{ width: 'fit-content' }}><Icon name="ticket" />Moje tickety</Link>
          </div>
          <div className="panel stack">
            <b>Dane firmy</b>
            <dl className="kv"><dt>Firma</dt><dd>{SITE.company.name}</dd><dt>Adres</dt><dd>{SITE.company.address}</dd><dt>NIP</dt><dd>{SITE.company.nip}</dd><dt>E-mail</dt><dd>{SITE.company.email}</dd></dl>
          </div>
        </div>
      </div>
    </div>
  );
}
