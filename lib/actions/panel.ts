'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '../db';
import { License, Ticket, User, nextSeq } from '@/models';
import { firstError, ticketSchema } from '../validation';
import { audit, requireUser } from '../auth';
import { rateLimit } from '../security';
import { webhook } from '../discord';
import { SITE } from '../site';
import type { FormState } from './public';

const MAX_UNBINDS = 3;
const month = () => new Date().toISOString().slice(0, 7);

/** Odpina serwer od licencji (limit 3 razy w miesiącu). */
export async function unbindServer(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(fd.get('license') || ''), server = String(fd.get('server') || '');
  if (!/^[a-f0-9]{24}$/.test(id)) return;
  await db();
  const lic = await License.findOne({ _id: id, userId: user.id, status: 'active' });
  if (!lic) return;
  if (lic.unbindsMonth !== month()) { lic.unbindsMonth = month(); lic.unbindsThisMonth = 0; }
  if (lic.unbindsThisMonth >= MAX_UNBINDS) redirect('/panel/zakupy?err=limit');
  const before = lic.servers.length;
  lic.servers = lic.servers.filter((s: any) => s.id !== server);
  if (lic.servers.length < before) {
    lic.unbindsThisMonth += 1;
    await lic.save();
    await audit(user, 'license.unbind', lic.productSlug, { last4: lic.keyLast4 });
  }
  revalidatePath('/panel/zakupy');
}

export async function createTicket(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit('ticket', user.discordId, 5, 3600))) return { ok: false, msg: 'Utworzyłeś już kilka ticketów w ciągu godziny.' };
  const parsed = ticketSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: firstError(parsed.error) };
  await db();
  const open = await Ticket.countDocuments({ userId: user.id, status: { $ne: 'closed' } });
  if (open >= 3) return { ok: false, msg: 'Masz już 3 otwarte tickety. Poczekaj na odpowiedź.' };
  const number = await nextSeq('ticket');
  const t = await Ticket.create({
    number, userId: user.id, discordId: user.discordId, username: user.name,
    subject: parsed.data.subject, category: parsed.data.category,
    messages: [{ staff: false, author: user.name, body: parsed.data.message, at: new Date() }],
  });
  webhook('alerts', { title: `Ticket #${number}: ${parsed.data.subject}`, url: `${SITE.url}/admin/tickety/${t._id}`, description: `<@${user.discordId}> · ${parsed.data.category}\n${parsed.data.message.slice(0, 300)}` });
  redirect(`/panel/tickety/${t._id}`);
}

export async function replyTicket(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get('id') || '');
  const body = z.string().trim().min(2, 'Wiadomość jest za krótka').max(4000).safeParse(fd.get('message'));
  if (!body.success) return { ok: false, msg: firstError(body.error) };
  if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, msg: 'Błędny ticket' };
  if (!(await rateLimit('ticket-reply', user.discordId, 20, 600))) return { ok: false, msg: 'Zwolnij trochę — za dużo wiadomości.' };
  await db();
  const r = await Ticket.updateOne(
    { _id: id, userId: user.id, status: { $ne: 'closed' } },
    { $push: { messages: { staff: false, author: user.name, body: body.data, at: new Date() } }, $set: { status: 'open' } },
  );
  if (!r.modifiedCount) return { ok: false, msg: 'Ticket jest zamknięty' };
  revalidatePath(`/panel/tickety/${id}`);
  return { ok: true, msg: 'Wysłano' };
}

export async function closeOwnTicket(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(fd.get('id') || '');
  if (!/^[a-f0-9]{24}$/.test(id)) return;
  await db();
  await Ticket.updateOne({ _id: id, userId: user.id }, { $set: { status: 'closed' } });
  revalidatePath(`/panel/tickety/${id}`);
}

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await db();
  await User.updateOne({ _id: user.id }, { $set: { newsletter: fd.get('newsletter') === 'on' } });
  revalidatePath('/panel/ustawienia');
  return { ok: true, msg: 'Zapisano ustawienia' };
}

export async function requestDeletion(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(fd.get('confirm') || '').trim().toUpperCase() !== 'USUŃ') return { ok: false, msg: 'Wpisz USUŃ, aby potwierdzić' };
  await db();
  await User.updateOne({ _id: user.id }, { $set: { deletionRequestedAt: new Date() } });
  await audit(user, 'user.deletion_request', user.discordId);
  webhook('alerts', { title: 'Wniosek o usunięcie konta (RODO)', description: `<@${user.discordId}> (${user.name}) — termin realizacji: 30 dni.`, color: 0xfbbf24 });
  return { ok: true, msg: 'Wniosek przyjęty. Usuniemy konto w ciągu 30 dni (dane zakupowe przechowujemy 5 lat zgodnie z przepisami podatkowymi).' };
}
