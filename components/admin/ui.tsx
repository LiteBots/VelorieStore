import Link from 'next/link';

export function AdminTop({ eyebrow = 'Panel admina', title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="panel-top">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function SearchBar({ q, placeholder, extra }: { q?: string; placeholder: string; extra?: React.ReactNode }) {
  return (
    <form className="toolbar" method="get">
      <label className="search-in"><input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label="Szukaj" /></label>
      {extra}
      <button className="btn btn-ghost" type="submit">Szukaj</button>
    </form>
  );
}

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}${base.includes('?') ? '&' : '?'}page=${p}`;
  return (
    <div className="pager">
      {page > 1 && <Link className="btn btn-sm btn-ghost" href={href(page - 1)}>← Poprzednia</Link>}
      <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>Strona {page} z {pages}</span>
      {page < pages && <Link className="btn btn-sm btn-ghost" href={href(page + 1)}>Następna →</Link>}
    </div>
  );
}

/** Przycisk akcji jako mini-formularz (server action). */
export function Act({ action, id, value, label, danger, extra }: { action: (fd: FormData) => Promise<void>; id: string; value: string; label: string; danger?: boolean; extra?: React.ReactNode }) {
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={value} />
      {extra}
      <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-ghost'}`} type="submit">{label}</button>
    </form>
  );
}

export const PER_PAGE = 25;
export const pageOf = (p?: string) => Math.max(1, Math.min(10000, parseInt(p || '1', 10) || 1));
export const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60);
