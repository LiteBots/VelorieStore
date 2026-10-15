import { getUser } from '@/lib/auth';
import { orderSchema, firstError } from '@/lib/validation';
import { createOrder, paymentsMode, quote } from '@/lib/orders';
import { fail, ipFrom, json, rateLimit, sameOrigin } from '@/lib/security';
import { hashIp } from '@/lib/crypto';
import { stripe } from '@/lib/stripe';
import { licOf } from '@/lib/catalog';
import { Order } from '@/models';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('Niedozwolone źródło żądania', 403);
  const user = await getUser();
  if (!user) return fail('Zaloguj się przez Discord, aby złożyć zamówienie', 401);
  try {
    const ip = ipFrom(req.headers);
    if (!(await rateLimit('checkout', ip, 10, 60))) return fail('Za dużo prób zamówienia, odczekaj minutę', 429);

    const parsed = orderSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(firstError(parsed.error));

    const mode = paymentsMode();
    if (mode === 'off') return fail('Płatności nie są jeszcze skonfigurowane. Napisz do nas na Discordzie.', 503);

    const q = await quote(parsed.data.items, parsed.data.coupon);
    if (!q.lines.length) return fail('Produkty z koszyka nie są już dostępne');
    if (parsed.data.coupon && q.couponError) return fail(q.couponError);
    if (q.total < 2) return fail('Minimalna kwota zamówienia to 2 zł');

    const order = await createOrder(user, q, mode === 'stripe' ? 'stripe' : 'demo', hashIp(ip));

    if (mode === 'stripe') {
      const session = await stripe().checkout.sessions.create({
        mode: 'payment',
        locale: 'pl',
        payment_method_types: ['blik', 'p24', 'card'],
        client_reference_id: String(order._id),
        metadata: { orderId: String(order._id), number: order.number },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'pln',
              unit_amount: Math.round(q.total * 100),
              product_data: {
                name: `Zamówienie ${order.number} · Velorie Market`,
                description: q.lines.map((l) => `${l.name} (${licOf(l.license).name})`).join(', ').slice(0, 480),
              },
            },
          },
        ],
        success_url: `${SITE.url}/zamowienie/${order.number}?status=ok`,
        cancel_url: `${SITE.url}/zamowienie/${order.number}?status=anulowano`,
      });
      await Order.updateOne({ _id: order._id }, { $set: { providerRef: session.id } });
      return json({ ok: true, mode: 'stripe', url: session.url });
    }

    return json({ ok: true, mode: 'demo', orderId: String(order._id), number: order.number, total: q.total, lines: q.lines, discount: q.discount });
  } catch (e) {
    console.error('[checkout]', e);
    return fail('Nie udało się utworzyć zamówienia', 500);
  }
}
