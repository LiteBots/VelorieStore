import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Order } from '@/models';
import { decrypt } from '@/lib/crypto';
import { licOf, zl } from '@/lib/catalog';
import { Icon } from '@/components/Icon';
import { KeyBox } from '@/components/panel/KeyBox';
import { AutoRefresh, ClearCartOnSuccess } from '@/components/panel/ClearCart';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Zamówienie', robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ status?: string }> }) {
  const { number } = await params;
  const { status } = await searchParams;
  const user = await requireUser(`/zamowienie/${number}`);
  if (!/^V-\d{1,9}$/.test(number)) notFound();
  await db();
  const o = await Order.findOne({ number, userId: user.id }).lean<any>();
  if (!o) notFound();
  const lics = o.status === 'paid' ? await License.find({ orderId: o._id }).lean<any[]>() : [];
  const paid = o.status === 'paid';
  return (
    <div className="wrap view" style={{ maxWidth: 720, paddingBlock: 48 }}>
      {status === 'ok' && <ClearCartOnSuccess />}
      {status === 'ok' && o.status === 'pending' && <AutoRefresh />}
      <div className="modal-box" style={{ transform: 'none', maxHeight: 'none', width: '100%' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {paid ? <span className="success-ico"><Icon name="check" /></span> : o.status === 'pending' ? <div className="spinner" /> : <span className="success-ico" style={{ color: 'var(--bad)', background: 'rgba(251,113,133,.12)', borderColor: 'rgba(251,113,133,.3)' }}><Icon name="x" /></span>}
          <h1 style={{ fontSize: 28 }}>
            {paid ? 'Płatność przyjęta' : o.status === 'pending' ? (status === 'ok' ? 'Czekamy na potwierdzenie płatności' : 'Zamówienie oczekuje na płatność') : o.status === 'refunded' ? 'Zamówienie zwrócone' : 'Płatność nieudana lub anulowana'}
          </h1>
          <p className="muted">Zamówienie {o.number} · {zl(o.total)}</p>
          {o.status === 'pending' && status === 'ok' && <p className="muted" style={{ fontSize: 13 }}>BLIK i karty potwierdzają się w kilka sekund, Przelewy24 do kilku minut. <Link href={`/zamowienie/${o.number}?status=ok`} style={{ color: 'var(--cyan)' }}>Odśwież</Link></p>}
        </div>
        <div className="order-sum">
          {o.items.map((i: any) => <div key={i.productSlug}><span>{i.name} <span className="muted">· {licOf(i.license).name}</span></span><span>{zl(i.price)}</span></div>)}
          {o.discount > 0 && <div style={{ color: 'var(--ok)' }}><span>Rabat {o.coupon}</span><span>−{zl(o.discount)}</span></div>}
          <div style={{ fontWeight: 800, fontSize: 16 }}><span>Razem</span><span>{zl(o.total)}</span></div>
        </div>
        {lics.map((l) => (
          <div key={String(l._id)}>
            <b style={{ fontSize: 13.5 }}>{o.items.find((i: any) => i.productSlug === l.productSlug)?.name} <span className="muted" style={{ fontWeight: 500 }}>· {licOf(l.tier).name}</span></b>
            <KeyBox value={decrypt(l.keyEnc)} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/sklep" className="btn btn-ghost" style={{ flex: 1 }}>Wróć do sklepu</Link>
          <Link href="/panel/zakupy" className="btn btn-primary" style={{ flex: 1 }}>Moje zakupy</Link>
        </div>
      </div>
    </div>
  );
}
