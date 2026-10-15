'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '../db';
import { Application, Contact, Coupon, License, Order, Product, Review, Seller, Ticket, User } from '@/models';
import { couponSchema, firstError, productSchema } from '../validation';
import { audit, requireAdmin } from '../auth';
import { fulfillOrder, refundOrder } from '../orders';
import { ensureSeed } from '../products';
import type { FormState } from './public';

const oid = (v: FormDataEntryValue | null) => {
  const s = String(v || '');
  if (!/^[a-f0-9]{24}$/.test(s)) throw new Error('Błędny identyfikator');
  return s;
};

/* ---------------- produkty ---------------- */
export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: `${parsed.error.issues[0]?.path.join('.')}: ${firstError(parsed.error)}` };
  const { releaseNotes, downloadUrl, ...data } = parsed.data;
  await db();
  const id = String(fd.get('_id') || '');
  const set: Record<string, unknown> = { ...data };
  if (downloadUrl) set.downloadUrl = downloadUrl;
  if (fd.get('clearDownload') === 'on') set.downloadUrl = null;

  if (id) {
    const prev = await Product.findById(id).lean<any>();
    if (!prev) return { ok: false, msg: 'Produkt nie istnieje' };
    const update: any = { $set: set };
    if (prev.version !== data.version || releaseNotes?.trim()) {
      update.$push = {
        changelog: {
          $each: [{ version: data.version, date: new Date().toISOString().slice(0, 10), notes: (releaseNotes || 'Aktualizacja').split('\n').map((x) => x.trim()).filter(Boolean) }],
          $position: 0,
        },
      };
    }
    await Product.updateOne({ _id: id }, update);
    await audit(admin, 'product.update', data.slug);
  } else {
    if (await Product.exists({ slug: data.slug })) return { ok: false, msg: 'Produkt o tym identyfikatorze już istnieje' };
    await Product.create({ ...set, changelog: [{ version: data.version, date: new Date().toISOString().slice(0, 10), notes: ['Pierwsze wydanie na Velorie Market'] }] });
    await audit(admin, 'product.create', data.slug);
  }
  revalidatePath('/', 'layout');
  redirect('/admin/produkty?saved=1');
}

export async function toggleProduct(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const p = await Product.findById(id).lean<any>();
  if (!p) return;
  await Product.updateOne({ _id: id }, { $set: { published: !p.published } });
  await audit(admin, p.published ? 'product.hide' : 'product.publish', p.slug);
  revalidatePath('/', 'layout');
}

export async function deleteProduct(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const p = await Product.findById(id).lean<any>();
  if (!p) return;
  if (await License.exists({ productSlug: p.slug })) {
    // Produkt z licencjami tylko ukrywamy — klienci zachowują dostęp.
    await Product.updateOne({ _id: id }, { $set: { published: false } });
  } else await Product.deleteOne({ _id: id });
  await audit(admin, 'product.delete', p.slug);
  revalidatePath('/', 'layout');
  redirect('/admin/produkty');
}

export async function loadDemoData() {
  const admin = await requireAdmin();
  await ensureSeed();
  await audit(admin, 'seed');
  revalidatePath('/', 'layout');
}

/* ---------------- zamówienia ---------------- */
export async function orderAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  if (action === 'paid') await fulfillOrder(id, 'manual-admin');
  if (action === 'refund') await refundOrder(id);
  if (action === 'cancel') await Order.updateOne({ _id: id, status: 'pending' }, { $set: { status: 'cancelled' } });
  await audit(admin, 'order.' + action, id);
  revalidatePath('/admin/zamowienia');
}

/* ---------------- użytkownicy ---------------- */
export async function userAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  const u = await User.findById(id).lean<any>();
  if (!u) return;
  if (u.discordId === admin.discordId && action !== 'role') return; // nie banujemy samych siebie
  if (action === 'role') {
    const role = z.enum(['user', 'creator', 'admin']).parse(fd.get('role'));
    if (u.discordId === admin.discordId && role !== 'admin') return;
    const sellerSlug = String(fd.get('seller') || '').trim() || null;
    await User.updateOne({ _id: id }, { $set: { role, sellerSlug: role === 'user' ? null : sellerSlug } });
  }
  if (action === 'ban') await User.updateOne({ _id: id }, { $set: { banned: true, banReason: String(fd.get('reason') || '').slice(0, 200) } });
  if (action === 'unban') await User.updateOne({ _id: id }, { $set: { banned: false, banReason: null } });
  await audit(admin, 'user.' + action, u.discordId);
  revalidatePath('/admin/uzytkownicy');
}

/* ---------------- licencje ---------------- */
export async function licenseAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  if (action === 'revoke') await License.updateOne({ _id: id }, { $set: { status: 'revoked' } });
  if (action === 'restore') await License.updateOne({ _id: id }, { $set: { status: 'active' } });
  if (action === 'reset') await License.updateOne({ _id: id }, { $set: { servers: [], unbindsThisMonth: 0 } });
  await audit(admin, 'license.' + action, id);
  revalidatePath('/admin/licencje');
}

/* ---------------- kupony ---------------- */
export async function createCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = couponSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: firstError(parsed.error) };
  await db();
  if (await Coupon.exists({ code: parsed.data.code })) return { ok: false, msg: 'Taki kod już istnieje' };
  await Coupon.create(parsed.data);
  await audit(admin, 'coupon.create', parsed.data.code);
  revalidatePath('/admin/kupony');
  return { ok: true, msg: `Kod ${parsed.data.code} utworzony` };
}

export async function couponAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  if (action === 'toggle') {
    const c = await Coupon.findById(id).lean<any>();
    if (c) await Coupon.updateOne({ _id: id }, { $set: { active: !c.active } });
  }
  if (action === 'delete') await Coupon.deleteOne({ _id: id });
  await audit(admin, 'coupon.' + action, id);
  revalidatePath('/admin/kupony');
}

/* ---------------- zgłoszenia twórców ---------------- */
export async function applicationAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  const a = await Application.findById(id).lean<any>();
  if (!a || a.status !== 'pending') return;
  if (action === 'approve') {
    const base = String(a.studio).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'tworca';
    let slug = base, i = 1;
    while (await Seller.exists({ slug })) slug = `${base}-${++i}`;
    await Seller.create({ slug, name: a.studio, ownerDiscordId: a.discordId, bio: String(a.about).slice(0, 300) });
    await User.updateOne({ _id: a.userId, role: { $ne: 'admin' } }, { $set: { role: 'creator', sellerSlug: slug } });
    await User.updateOne({ _id: a.userId, role: 'admin' }, { $set: { sellerSlug: slug } });
  }
  await Application.updateOne({ _id: id }, { $set: { status: action === 'approve' ? 'approved' : 'rejected', note: String(fd.get('note') || '').slice(0, 300) } });
  await audit(admin, 'application.' + action, a.studio);
  revalidatePath('/admin/zgloszenia');
}

/* ---------------- wiadomości i tickety ---------------- */
export async function messageAction(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const action = String(fd.get('action'));
  if (action === 'read') await Contact.updateOne({ _id: id }, { $set: { read: true } });
  if (action === 'delete') await Contact.deleteOne({ _id: id });
  await audit(admin, 'contact.' + action, id);
  revalidatePath('/admin/wiadomosci');
}

export async function adminReplyTicket(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = oid(fd.get('id'));
  const body = z.string().trim().min(2).max(4000).safeParse(fd.get('message'));
  if (!body.success) return { ok: false, msg: 'Wiadomość jest za krótka' };
  await db();
  await Ticket.updateOne({ _id: id }, { $push: { messages: { staff: true, author: admin.name, body: body.data, at: new Date() } }, $set: { status: 'answered' } });
  revalidatePath(`/admin/tickety/${id}`);
  return { ok: true, msg: 'Odpowiedź wysłana' };
}

export async function ticketStatus(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const status = z.enum(['open', 'answered', 'closed']).parse(fd.get('status'));
  await Ticket.updateOne({ _id: id }, { $set: { status } });
  await audit(admin, 'ticket.' + status, id);
  revalidatePath(`/admin/tickety/${id}`);
}

export async function reviewVisibility(fd: FormData) {
  const admin = await requireAdmin();
  await db();
  const id = oid(fd.get('id'));
  const r = await Review.findById(id).lean<any>();
  if (!r) return;
  await Review.updateOne({ _id: id }, { $set: { hidden: !r.hidden } });
  await audit(admin, 'review.toggle', id);
  revalidatePath(`/produkt/${r.productSlug}`);
}
