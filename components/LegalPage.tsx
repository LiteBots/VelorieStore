import Link from 'next/link';
import { Icon } from './Icon';
import { SITE } from '@/lib/site';

export function LegalPage({ title, intro, toc, children }: { title: string; intro?: string; toc: [string, string][]; children: React.ReactNode }) {
  return (
    <div className="view wrap">
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>{title}</span></nav>
        <h1 style={{ fontSize: 'clamp(32px,4.4vw,52px)' }}>{title}</h1>
        <p>{intro || `Obowiązuje od: ${SITE.legalUpdated}.`}</p>
      </div>
      <div className="legal-wrap">
        <nav className="toc" aria-label="Spis treści">
          {toc.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </nav>
        <article className="prose">{children}</article>
      </div>
    </div>
  );
}

export const Co = () => (
  <>
    <strong>{SITE.company.name}</strong>, {SITE.company.address}, NIP {SITE.company.nip}, e-mail: <a href={`mailto:${SITE.company.email}`}>{SITE.company.email}</a>
  </>
);
