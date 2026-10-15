'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { Application, Contact, License, Product, Review, Subscriber, User } from '@/models';
import { applicationSchema, contactSchema, firstError } from '../validation';
import { clientIp, rateLimit } from '../security';
import { hashIp, randomToken, sha256 } from '../crypto';
import { getUser } from '../auth';
import { webhook } from '../discord';
import { z } from 'zod';

export interface FormState { ok?: boolean; msg?: string }

const honeypot = (fd: FormData) => String(fd.get('website') || '').length > 0;

export async function contactAction(_: FormState, fd: FormData): Promise<FormState> {
  if (honeypot(fd)) return { ok: true, msg: 'Dziękujemy! Odpowiemy w ciągu 24 godzin.' };
  const ip = await clientIp();
  if (!(await rateLimit('contact', ip, 3, 600))) return { ok: false, msg: 'Wysłałeś już kilka wiadomości. Spróbuj za 10 minut.' };
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: firstError(parsed.error) };
  const { consent, ...data } = parsed.data;
  await db();
  await Contact.create({ ...data, ipHash: hashIp(ip) });
  webhook('alerts', {
    title: 'Nowa wiadomość z formularza kontaktowego',
    description: `**${data.name}** · ${data.topic}\n${data.message.slice(0, 300)}`,
  });
  return { ok: true, msg: 'Dziękujemy! Odpowiemy na podany e-mail w ciągu 24 godzin.' };
}

export async function newsletterAction(_: FormState, fd: FormData): Promise<FormState> {
  if (honeypot(fd)) return { ok: true, msg: 'Zapisano.' };
  const ip = await clientIp();
  if (!(await rateLimit('newsletter', ip, 5, 3600))) return { ok: false, msg: 'Za dużo prób. Spróbuj później.' };
  const email = z.string().trim().toLowerCase().email().max(120).safeParse(fd.get('email'));
  if (!email.success) return { ok: false, msg: 'Podaj poprawny adres e-mail' };
  await db();
  const token = randomToken(24);
  await Subscriber.updateOne(
    { email: email.data },
    { $set: { active: true }, $setOnInsert: { tokenHash: sha256(token) } },
    { upsert: true },
  );
  return { ok: true, msg: 'Zapisano do newslettera. Pierwszy mail w piątek.' };
}

export async function applyAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { ok: false, msg: 'Zaloguj się przez Discord, aby wysłać zgłoszenie.' };
  if (!(await rateLimit('apply', user.discordId, 3, 86400))) return { ok: false, msg: 'Wysłałeś już zgłoszenie. Odpowiemy w ciągu 48 godzin.' };
  const parsed = applicationSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: firstError(parsed.error) };
  await db();
  const pending = await Application.findOne({ userId: user.id, status: 'pending' }).lean();
  if (pending) return { ok: false, msg: 'Masz już zgłoszenie w trakcie weryfikacji.' };
  const { terms, ...data } = parsed.data;
  await Application.create({ ...data, userId: user.id, discordId: user.discordId, username: user.name });
  webhook('alerts', { title: 'Nowe zgłoszenie twórcy', description: `**${data.studio}** (<@${user.discordId}>) · ${data.plat}\n${data.portfolio}` });
  return { ok: true, msg: 'Zgłoszenie wysłane! Damy znać na Discordzie w ciągu 48 godzin.' };
}

export async function reviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { ok: false, msg: 'Zaloguj się, aby dodać opinię.' };
  const parsed = z
    .object({
      slug: z.string().regex(/^[a-z0-9-]+$/i),
      rating: z.coerce.number().int().min(1).max(5),
      text: z.string().trim().min(10, 'Opinia musi mieć min. 10 znaków').max(1200),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: firstError(parsed.error) };
  const { slug, rating, text } = parsed.data;
  await db();
  const owns = await License.exists({ userId: user.id, productSlug: slug, status: 'active' });
  if (!owns) return { ok: false, msg: 'Opinię może dodać tylko właściciel licencji.' };
  const exists = await Review.exists({ productSlug: slug, userId: user.id });
  if (exists) return { ok: false, msg: 'Już oceniłeś ten produkt.' };
  await Review.create({ productSlug: slug, userId: user.id, username: user.name, rating, text });
  const p = await Product.findOne({ slug }).lean<any>();
  if (p) {
    const n = (p.reviewsCount || 0) + 1;
    const avg = ((p.rating || 0) * (n - 1) + rating) / n;
    await Product.updateOne({ slug }, { $set: { rating: Math.round(avg * 100) / 100, reviewsCount: n } });
  }
  revalidatePath(`/produkt/${slug}`);
  return { ok: true, msg: 'Dziękujemy za opinię!' };
}

export async function unsubscribeAll(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await db();
  await User.updateOne({ _id: user.id }, { $set: { newsletter: false } });
}
