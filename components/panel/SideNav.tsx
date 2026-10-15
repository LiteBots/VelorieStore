'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../Icon';

export interface NavItem { href: string; label: string; icon: string; badge?: number }

export function SideNav({ items, who }: { items: NavItem[]; who: { name: string; sub: string; image?: string | null; color?: string } }) {
  const path = usePathname();
  const active = (href: string) => (href === items[0].href ? path === href : path === href || path.startsWith(href + '/'));
  return (
    <nav className="dnav" aria-label="Menu panelu">
      <div className="who">
        {who.image ? <img className="av" src={who.image} alt="" width={38} height={38} style={{ objectFit: 'cover' }} /> : <span className="av" style={{ background: who.color || 'linear-gradient(135deg,#4a82ff,#38bdf8)' }}>{who.name[0]}</span>}
        <div><b>{who.name}</b><small>{who.sub}</small></div>
      </div>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`fi ${active(it.href) ? 'on' : ''}`}>
          <Icon name={it.icon} />{it.label}{it.badge ? <small style={{ color: 'var(--cyan)' }}>{it.badge}</small> : null}
        </Link>
      ))}
    </nav>
  );
}
