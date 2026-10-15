import { z } from 'zod';

const slug = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/i, 'Niepoprawny identyfikator');
const lic = z.enum(['std', 'pro', 'net']);

export const checkoutSchema = z.object({
  items: z.array(z.object({ slug, lic })).min(1, 'Koszyk jest pusty').max(30),
  coupon: z.string().trim().toUpperCase().max(24).regex(/^[A-Z0-9]*$/).optional().nullable(),
});

/** Zamówienie wymaga akceptacji regulaminu i zgody na natychmiastowe dostarczenie treści cyfrowej (art. 38 pkt 13 u.p.k.). */
export const orderSchema = checkoutSchema.extend({
  terms: z.literal(true, { errorMap: () => ({ message: 'Zaakceptuj regulamin i zgodę na dostarczenie treści cyfrowej' }) }),
});

export const demoConfirmSchema = z.object({
  orderId: z.string().regex(/^[a-f0-9]{24}$/),
  code: z.string().regex(/^\d{6}$/, 'Kod BLIK ma 6 cyfr'),
});

export const licenseKeySchema = z.string().trim().toUpperCase().regex(/^VLR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Klucz ma postać VLR-XXXX-XXXX-XXXX');

export const verifySchema = z.object({
  key: licenseKeySchema,
  product: slug,
  server_id: z.string().trim().max(120).optional(),
  server_name: z.string().trim().max(80).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Podaj imię lub nick').max(60),
  email: z.string().trim().email('Niepoprawny e-mail').max(120),
  topic: z.enum(['zakup', 'licencja', 'wspolpraca', 'zwrot', 'inne']),
  message: z.string().trim().min(15, 'Wiadomość jest za krótka (min. 15 znaków)').max(3000),
  consent: z.literal('on', { errorMap: () => ({ message: 'Zaakceptuj politykę prywatności' }) }),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(4, 'Temat jest za krótki').max(100),
  category: z.enum(['zakup', 'licencja', 'techniczne', 'zwrot', 'inne']),
  message: z.string().trim().min(10, 'Opisz problem (min. 10 znaków)').max(4000),
});

export const applicationSchema = z.object({
  studio: z.string().trim().min(2, 'Podaj nazwę studia lub nick').max(40),
  plat: z.enum(['minecraft', 'fivem', 'other', 'multi']),
  portfolio: z.string().trim().url('Podaj link (GitHub, Behance, YouTube…)').max(300),
  about: z.string().trim().min(30, 'Opisz swoje projekty (min. 30 znaków)').max(2000),
  terms: z.literal('on', { errorMap: () => ({ message: 'Zaakceptuj regulamin dla twórców' }) }),
});

export const productSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(60),
  cat: z.string().trim().max(40),
  art: z.string().trim().max(30),
  seller: slug,
  price: z.coerce.number().min(1).max(20000),
  oldPrice: z.coerce.number().min(0).max(20000).optional().transform((v) => (v ? v : null)),
  badge: z.enum(['', 'bestseller', 'nowość', 'promocja']),
  tech: z.string().max(300).transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
  compat: z.string().trim().max(80),
  type: z.string().trim().max(40),
  version: z.string().trim().max(20),
  desc: z.string().trim().max(240),
  longDesc: z.string().trim().max(6000),
  feats: z.string().max(3000).transform((s) => s.split('\n').map((x) => x.trim()).filter(Boolean)),
  resmon: z.string().trim().max(20).optional().transform((v) => v || null),
  imageUrl: z.string().trim().max(400).optional().transform((v) => v || null),
  downloadUrl: z.string().trim().max(600).optional().transform((v) => v || null),
  published: z.string().optional().transform((v) => v === 'on'),
  releaseNotes: z.string().max(2000).optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(24).regex(/^[A-Z0-9]+$/),
  pct: z.coerce.number().int().min(1).max(90),
  plat: z.enum(['', 'minecraft', 'fivem', 'other']).transform((v) => v || null),
  maxUses: z.coerce.number().int().min(0).max(1000000),
  expiresAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
});

/** Zamienia błędy zod na pierwszy czytelny komunikat. */
export const firstError = (e: z.ZodError) => e.issues[0]?.message || 'Niepoprawne dane';
