const MAP: Record<string, [string, string]> = {
  paid: ['ok', 'opłacone'], pending: ['warn', 'oczekuje'], refunded: ['bad', 'zwrot'], cancelled: ['bad', 'anulowane'], failed: ['bad', 'nieudane'],
  active: ['ok', 'aktywna'], revoked: ['bad', 'unieważniona'],
  open: ['info', 'otwarty'], answered: ['ok', 'odpowiedziano'], closed: ['bad', 'zamknięty'],
  approved: ['ok', 'zaakceptowane'], rejected: ['bad', 'odrzucone'],
};

export function StatusPill({ s }: { s: string }) {
  const [cls, label] = MAP[s] || ['info', s];
  return <span className={`status ${cls}`}>{label}</span>;
}
