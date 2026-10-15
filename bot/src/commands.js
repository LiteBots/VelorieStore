import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits,
  SlashCommandBuilder, StringSelectMenuBuilder,
} from 'discord.js';
import { cfg } from './config.js';
import { KEY_RE, License, Product, Seller, User, hashKey } from './db.js';

const TIERS = { std: 'Standard', pro: 'Pro', net: 'Network' };
const CATS = {
  'mc-plugin': 'Pluginy Minecraft', 'mc-map': 'Mapy Minecraft', 'mc-setup': 'Setupy Minecraft', 'mc-pack': 'Resource packi',
  'fivem-script': 'Skrypty FiveM', 'fivem-mlo': 'Interiory MLO', 'fivem-map': 'Mapy FiveM', 'fivem-vehicle': 'Pojazdy FiveM',
  discord: 'Boty Discord', web: 'Strony WWW', gfx: 'Grafiki',
};
export const TICKET_CATEGORIES = [
  { value: 'zakup', label: 'Zakup i płatność', emoji: '💳', description: 'Problemy z płatnością lub zamówieniem' },
  { value: 'licencja', label: 'Licencja', emoji: '🔑', description: 'Aktywacja, zmiana serwera, klucz' },
  { value: 'techniczne', label: 'Problem techniczny', emoji: '🛠️', description: 'Produkt nie działa jak powinien' },
  { value: 'wspolpraca', label: 'Współpraca / sprzedaż', emoji: '🤝', description: 'Chcę sprzedawać na Velorie' },
  { value: 'inne', label: 'Inne', emoji: '💬', description: 'Wszystko inne' },
];

const zl = (n) => `${(Math.round(n * 100) / 100).toLocaleString('pl-PL')} zł`;
const embed = () => new EmbedBuilder().setColor(cfg.color).setFooter({ text: 'Velorie Market', iconURL: `${cfg.site}/brand/logo-128.png` }).setTimestamp();
const link = (label, url) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
const eph = { flags: MessageFlags.Ephemeral };

export const definitions = [
  new SlashCommandBuilder().setName('sklep').setDescription('Link do sklepu i bestsellery'),
  new SlashCommandBuilder().setName('produkt').setDescription('Pokaż produkt ze sklepu')
    .addStringOption((o) => o.setName('nazwa').setDescription('Nazwa produktu').setRequired(true).setAutocomplete(true)),
  new SlashCommandBuilder().setName('licencja').setDescription('Licencje Velorie')
    .addSubcommand((s) => s.setName('sprawdz').setDescription('Sprawdź klucz licencji (odpowiedź widzisz tylko Ty)')
      .addStringOption((o) => o.setName('klucz').setDescription('VLR-XXXX-XXXX-XXXX').setRequired(true).setMinLength(18).setMaxLength(18)))
    .addSubcommand((s) => s.setName('moje').setDescription('Lista Twoich licencji')),
  new SlashCommandBuilder().setName('statystyki').setDescription('Statystyki Velorie Market'),
  new SlashCommandBuilder().setName('pomoc').setDescription('Jak korzystać z bota i sklepu'),
  new SlashCommandBuilder().setName('panel-ticketow').setDescription('Wyślij panel tworzenia ticketów na ten kanał')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('panel-weryfikacji').setDescription('Wyślij panel weryfikacji na ten kanał')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('ogloszenie').setDescription('Wyślij ogłoszenie jako embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('tytul').setDescription('Tytuł').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('tresc').setDescription('Treść (\\n = nowa linia)').setRequired(true).setMaxLength(3500))
    .addStringOption((o) => o.setName('link').setDescription('Opcjonalny link (np. do produktu)')),
].map((c) => c.toJSON());

/* ------------------------------------------------------------------ */

export async function autocomplete(i) {
  const q = String(i.options.getFocused() || '').slice(0, 40);
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const list = await Product.find(q ? { published: true, name: { $regex: esc, $options: 'i' } } : { published: true })
    .sort({ sales: -1 }).limit(25).select('slug name price').lean();
  await i.respond(list.map((p) => ({ name: `${p.name} · ${zl(p.price)}`.slice(0, 100), value: p.slug })));
}

export async function run(i) {
  switch (i.commandName) {
    case 'sklep': return sklep(i);
    case 'produkt': return produkt(i);
    case 'licencja': return i.options.getSubcommand() === 'sprawdz' ? sprawdz(i) : moje(i);
    case 'statystyki': return statystyki(i);
    case 'pomoc': return pomoc(i);
    case 'panel-ticketow': return panelTicketow(i);
    case 'panel-weryfikacji': return panelWeryfikacji(i);
    case 'ogloszenie': return ogloszenie(i);
  }
}

async function sklep(i) {
  const top = await Product.find({ published: true }).sort({ sales: -1 }).limit(5).lean();
  const e = embed()
    .setTitle('🛒 Velorie Market')
    .setURL(cfg.site)
    .setDescription('Pluginy Minecraft, skrypty FiveM, mapy, interiory MLO i gotowe setupy. Klucz licencji dostajesz od razu po płatności.')
    .addFields({ name: 'Bestsellery', value: top.map((p, n) => `**${n + 1}.** [${p.name}](${cfg.site}/produkt/${p.slug}) — ${zl(p.price)}`).join('\n') || '—' });
  await i.reply({ embeds: [e], components: [new ActionRowBuilder().addComponents(link('Przejdź do sklepu', `${cfg.site}/sklep`), link('Moje zakupy', `${cfg.site}/panel/zakupy`))] });
}

async function produkt(i) {
  const v = i.options.getString('nazwa', true).slice(0, 80);
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const p = (await Product.findOne({ slug: v, published: true }).lean()) || (await Product.findOne({ published: true, name: { $regex: esc, $options: 'i' } }).lean());
  if (!p) return i.reply({ content: 'Nie znalazłem takiego produktu.', ...eph });
  const s = await Seller.findOne({ slug: p.seller }).lean();
  const e = embed()
    .setTitle(p.name)
    .setURL(`${cfg.site}/produkt/${p.slug}`)
    .setDescription(p.desc || '')
    .addFields(
      { name: 'Cena', value: `${zl(p.price)}${p.oldPrice ? ` ~~${zl(p.oldPrice)}~~` : ''}`, inline: true },
      { name: 'Ocena', value: `⭐ ${Number(p.rating || 0).toFixed(1)} (${p.reviewsCount || 0})`, inline: true },
      { name: 'Wersja', value: `v${p.version}`, inline: true },
      { name: 'Kategoria', value: CATS[p.cat] || p.cat, inline: true },
      { name: 'Zgodność', value: p.compat || '—', inline: true },
      { name: 'Twórca', value: s?.name || p.seller, inline: true },
    );
  if (p.feats?.length) e.addFields({ name: 'Funkcje', value: p.feats.slice(0, 6).map((f) => `• ${f}`).join('\n') });
  if (p.resmon) e.addFields({ name: 'Resmon', value: `\`${p.resmon}\``, inline: true });
  await i.reply({ embeds: [e], components: [new ActionRowBuilder().addComponents(link('Kup w sklepie', `${cfg.site}/produkt/${p.slug}`))] });
}

async function sprawdz(i) {
  const key = i.options.getString('klucz', true).trim().toUpperCase();
  if (!KEY_RE.test(key)) return i.reply({ content: '❌ Klucz ma postać `VLR-XXXX-XXXX-XXXX`.', ...eph });
  const l = await License.findOne({ keyHash: hashKey(key) }).lean();
  if (!l) return i.reply({ content: '❌ Taki klucz nie istnieje.', ...eph });
  const p = await Product.findOne({ slug: l.productSlug }).lean();
  const e = embed()
    .setTitle(l.status === 'active' ? '✅ Licencja aktywna' : '⛔ Licencja unieważniona')
    .setColor(l.status === 'active' ? 0x34d399 : 0xfb7185)
    .addFields(
      { name: 'Produkt', value: p?.name || l.productSlug, inline: true },
      { name: 'Typ', value: TIERS[l.tier] || l.tier, inline: true },
      { name: 'Serwery', value: `${l.servers?.length || 0} / ${l.maxServers >= 999 ? '∞' : l.maxServers}`, inline: true },
      { name: 'Aktualizacje', value: l.updatesUntil ? `do <t:${Math.floor(new Date(l.updatesUntil).getTime() / 1000)}:D>` : 'dożywotnio', inline: true },
      { name: 'Właściciel', value: l.discordId === i.user.id ? 'Ty' : 'inne konto', inline: true },
    );
  await i.reply({ embeds: [e], ...eph });
}

async function moje(i) {
  const list = await License.find({ discordId: i.user.id }).sort({ createdAt: -1 }).limit(20).lean();
  if (!list.length) return i.reply({ content: `Nie masz jeszcze licencji. Sklep: ${cfg.site}/sklep`, ...eph });
  const prods = await Product.find({ slug: { $in: list.map((l) => l.productSlug) } }).select('slug name').lean();
  const names = Object.fromEntries(prods.map((p) => [p.slug, p.name]));
  const e = embed()
    .setTitle('🔑 Twoje licencje')
    .setDescription(list.map((l) => `${l.status === 'active' ? '🟢' : '🔴'} **${names[l.productSlug] || l.productSlug}** · ${TIERS[l.tier]} · \`VLR-••••-••••-${l.keyLast4}\` · serwery ${l.servers?.length || 0}/${l.maxServers >= 999 ? '∞' : l.maxServers}`).join('\n'))
    .addFields({ name: 'Pełne klucze i pliki', value: `[Panel → Moje zakupy](${cfg.site}/panel/zakupy)` });
  await i.reply({ embeds: [e], ...eph });
}

async function statystyki(i) {
  const [products, licenses, users, sellers] = await Promise.all([
    Product.countDocuments({ published: true }), License.countDocuments({ status: 'active' }), User.countDocuments(), Seller.countDocuments(),
  ]);
  const e = embed().setTitle('📊 Velorie Market w liczbach').addFields(
    { name: 'Produkty', value: products.toLocaleString('pl-PL'), inline: true },
    { name: 'Aktywne licencje', value: licenses.toLocaleString('pl-PL'), inline: true },
    { name: 'Twórcy', value: sellers.toLocaleString('pl-PL'), inline: true },
    { name: 'Konta', value: users.toLocaleString('pl-PL'), inline: true },
  );
  await i.reply({ embeds: [e] });
}

async function pomoc(i) {
  const e = embed().setTitle('ℹ️ Pomoc').setDescription([
    '`/sklep` — link do sklepu i bestsellery',
    '`/produkt nazwa` — szczegóły produktu',
    '`/licencja sprawdz` — sprawdź klucz (widzisz tylko Ty)',
    '`/licencja moje` — Twoje licencje',
    '`/statystyki` — liczby platformy',
    '',
    `Problem z zakupem? Otwórz ticket na kanale wsparcia albo w [panelu klienta](${cfg.site}/panel/tickety).`,
  ].join('\n'));
  await i.reply({ embeds: [e], ...eph });
}

async function panelTicketow(i) {
  const e = embed()
    .setTitle('🎫 Centrum pomocy Velorie')
    .setDescription('Wybierz kategorię poniżej, a utworzymy prywatny kanał z zespołem wsparcia.\n\n**Przed otwarciem:** przygotuj numer zamówienia lub końcówkę klucza licencji oraz logi z konsoli.')
    .setThumbnail(`${cfg.site}/brand/logo-512.png`);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:open')
    .setPlaceholder('Wybierz kategorię zgłoszenia')
    .addOptions(TICKET_CATEGORIES.map((c) => ({ label: c.label, value: c.value, emoji: c.emoji, description: c.description })));
  await i.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] });
  await i.reply({ content: 'Panel ticketów wysłany ✅', ...eph });
}

async function panelWeryfikacji(i) {
  if (!cfg.verifiedRole) return i.reply({ content: 'Ustaw VERIFIED_ROLE_ID w zmiennych bota.', ...eph });
  const e = embed().setTitle('✅ Weryfikacja').setDescription('Kliknij przycisk, aby potwierdzić, że akceptujesz regulamin serwera i uzyskać dostęp do kanałów.');
  const btn = new ButtonBuilder().setCustomId('verify').setLabel('Weryfikuję się').setStyle(ButtonStyle.Success).setEmoji('✅');
  await i.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(btn, link('Regulamin', `${cfg.site}/regulamin`))] });
  await i.reply({ content: 'Panel weryfikacji wysłany ✅', ...eph });
}

async function ogloszenie(i) {
  const e = embed().setTitle(i.options.getString('tytul', true)).setDescription(i.options.getString('tresc', true).replace(/\\n/g, '\n'));
  const url = i.options.getString('link');
  const components = url && /^https?:\/\//.test(url) ? [new ActionRowBuilder().addComponents(link('Zobacz', url))] : [];
  await i.channel.send({ embeds: [e], components });
  await i.reply({ content: 'Ogłoszenie wysłane ✅', ...eph });
}
