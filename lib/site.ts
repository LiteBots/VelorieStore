// Konfiguracja marki i danych firmy. Wartości firmowe ustawiasz w zmiennych NEXT_PUBLIC_COMPANY_*.
const url = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const SITE = {
  name: 'Velorie Market',
  short: 'Velorie',
  url,
  locale: 'pl_PL',
  description:
    'Marketplace pluginów Minecraft, skryptów FiveM, map, interiorów MLO i gotowych setupów serwerów. Licencje z natychmiastową dostawą, BLIK i Przelewy24, 14 dni gwarancji.',
  keywords: [
    'pluginy minecraft', 'skrypty fivem', 'mlo fivem', 'mapy minecraft', 'setup boxpvp', 'esx', 'qbcore', 'qbox',
    'sklep z pluginami', 'resource pack', 'interiory mlo', 'bot discord tickety', 'marketplace serwerów',
  ],
  twitter: '@velorie',
  discordInvite: process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.com',
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || '[Nazwa firmy]',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '[Adres firmy]',
    nip: process.env.NEXT_PUBLIC_COMPANY_NIP || '[NIP]',
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'support@velorie.market',
  },
  legalUpdated: '15 października 2026',
};

export const abs = (path: string) => `${SITE.url}${path.startsWith('/') ? path : '/' + path}`;
