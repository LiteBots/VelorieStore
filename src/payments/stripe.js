// Stripe Checkout bez SDK (REST + weryfikacja podpisu webhooka).
// Wymaga: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYMENT_PROVIDER=stripe
// Webhook w panelu Stripe: {BASE_URL}/api/payments/stripe/webhook  (zdarzenie: checkout.session.completed)
const crypto = require('crypto');
const env = require('../env');

module.exports = {
  label: 'Karta / BLIK / Przelewy24 (Stripe)',

  async createPayment(order, items, user) {
    if (!env.STRIPE_SECRET_KEY) throw new Error('Brak STRIPE_SECRET_KEY w .env');
    const form = new URLSearchParams();
    form.append('mode', 'payment');
    form.append('success_url', `${env.BASE_URL}/koszyk.html?order=${order.number}&status=success`);
    form.append('cancel_url', `${env.BASE_URL}/koszyk.html?order=${order.number}&status=cancel`);
    form.append('client_reference_id', String(order.id));
    form.append('metadata[order_id]', String(order.id));
    if (user.email) form.append('customer_email', user.email);
    items.forEach((it, i) => {
      form.append(`line_items[${i}][quantity]`, '1');
      form.append(`line_items[${i}][price_data][currency]`, 'pln');
      form.append(`line_items[${i}][price_data][unit_amount]`, String(it.total));
      form.append(`line_items[${i}][price_data][product_data][name]`, it.title);
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const j = await r.json();
    if (!r.ok) throw new Error('Stripe: ' + (j.error && j.error.message));
    return { type: 'redirect', url: j.url, ref: j.id };
  },

  handleWebhook(req, rawBody) {
    const sig = String(req.headers['stripe-signature'] || '');
    const parts = Object.fromEntries(sig.split(',').map((kv) => kv.split('=')));
    if (!parts.t || !parts.v1 || !env.STRIPE_WEBHOOK_SECRET) throw new Error('Brak podpisu');
    const expected = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${parts.t}.${rawBody}`).digest('hex');
    if (expected.length !== parts.v1.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))) throw new Error('Zły podpis');
    if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) throw new Error('Przeterminowany podpis');
    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') return null;
    const s = event.data.object;
    if (s.payment_status !== 'paid') return null;
    return { orderId: Number(s.metadata && s.metadata.order_id), ref: s.id };
  },
};
