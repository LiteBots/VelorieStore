import { getUser } from '@/lib/auth';
import { demoConfirmSchema, firstError } from '@/lib/validation';
import { fulfillOrder, paymentsMode } from '@/lib/orders';
import { fail, ipFrom, json, rateLimit, sameOrigin } from '@/lib/security';
import { db } from '@/lib/db';
import { Order } from '@/models';

export const dynamic = 'force-dynamic';

/** Tryb demonstracyjny płatności (ALLOW_DEMO_PAYMENTS=true, brak Stripe). Na produkcji wyłączony. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('Niedozwolone źródło żądania', 403);
  if (paymentsMode() !== 'demo') return fail('Tryb demonstracyjny jest wyłączony', 403);
  const user = await getUser();
  if (!user) return fail('Zaloguj się ponownie', 401);
  if (!(await rateLimit('demo-pay', ipFrom(req.headers), 10, 60))) return fail('Za dużo prób', 429);

  const parsed = demoConfirmSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(firstError(parsed.error));
  await db();
  const order = await Order.findOne({ _id: parsed.data.orderId, userId: user.id, provider: 'demo' }).lean<any>();
  if (!order) return fail('Nie znaleziono zamówienia', 404);
  if (order.status !== 'pending') return fail('To zamówienie zostało już rozliczone', 409);

  const { keys } = await fulfillOrder(String(order._id), 'demo-blik');
  return json({ ok: true, number: order.number, total: order.total, keys });
}
