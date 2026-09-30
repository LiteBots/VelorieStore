// Bramki płatności. Każdy provider implementuje:
//   createPayment(order, items, user) -> { type: 'instant' } | { type: 'redirect', url }
//   handleWebhook(req, rawBody) -> { orderId, ref } | null   (opcjonalnie)
// Aby dodać Przelewy24 / PayU / tpay: stwórz plik w tym katalogu i dopisz go do PROVIDERS.
const env = require('../env');

const PROVIDERS = {
  // Tryb demo: zamówienie opłaca się natychmiast (bez realnych pieniędzy)
  demo: {
    label: 'Płatność testowa (demo)',
    async createPayment() { return { type: 'instant', ref: 'demo_' + Date.now() }; },
  },
  stripe: require('./stripe'),
};

function current() {
  const p = PROVIDERS[env.PAYMENT_PROVIDER];
  if (!p) throw new Error(`Nieznany PAYMENT_PROVIDER: ${env.PAYMENT_PROVIDER}`);
  return { name: env.PAYMENT_PROVIDER, ...p };
}

module.exports = { current, PROVIDERS };
