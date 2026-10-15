import { checkoutSchema, firstError } from '@/lib/validation';
import { quote, paymentsMode } from '@/lib/orders';
import { fail, ipFrom, json, rateLimit, sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Wycena koszyka (z kodem rabatowym) liczona na serwerze. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('Niedozwolone źródło żądania', 403);
  try {
    if (!(await rateLimit('quote', ipFrom(req.headers), 40, 60))) return fail('Za dużo prób, odczekaj minutę', 429);
    const parsed = checkoutSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(firstError(parsed.error));
    const q = await quote(parsed.data.items, parsed.data.coupon);
    return json({ ok: true, ...q, payments: paymentsMode() });
  } catch (e) {
    console.error('[quote]', e);
    return fail('Nie udało się przeliczyć koszyka', 500);
  }
}
