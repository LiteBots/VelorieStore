import { stripe } from '@/lib/stripe';
import { fulfillOrder } from '@/lib/orders';
import { db } from '@/lib/db';
import { Order } from '@/models';
import { webhook } from '@/lib/discord';

export const dynamic = 'force-dynamic';

/**
 * Webhook Stripe. W panelu Stripe dodaj endpoint:  https://TWOJA-DOMENA/api/webhooks/stripe
 * Zdarzenia: checkout.session.completed, checkout.session.async_payment_succeeded,
 *            checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return new Response('Brak konfiguracji', { status: 400 });

  const raw = await req.text();
  let event: any;
  try {
    // Weryfikacja podpisu — odrzuca sfałszowane żądania.
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error('[stripe] zły podpis', (e as Error).message);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await db();
    const s = event.data?.object || {};
    const orderId = s.metadata?.orderId;
    switch (event.type) {
      case 'checkout.session.completed':
        if (orderId && s.payment_status === 'paid') await fulfillOrder(orderId, s.id);
        break;
      case 'checkout.session.async_payment_succeeded':
        if (orderId) await fulfillOrder(orderId, s.id);
        break;
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        if (orderId) await Order.updateOne({ _id: orderId, status: 'pending' }, { $set: { status: event.type.endsWith('expired') ? 'cancelled' : 'failed' } });
        break;
    }
  } catch (e) {
    console.error('[stripe] obsługa', e);
    webhook('alerts', { title: 'Błąd webhooka Stripe', description: String((e as Error).message).slice(0, 500), color: 0xfb7185 });
    return new Response('Error', { status: 500 }); // Stripe ponowi wysyłkę
  }
  return new Response('ok');
}
