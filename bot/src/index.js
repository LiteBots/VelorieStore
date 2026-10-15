import { ActivityType, Client, EmbedBuilder, Events, GatewayIntentBits, MessageFlags, REST, Routes } from 'discord.js';
import { cfg } from './config.js';
import { License, Product, connect } from './db.js';
import { autocomplete, definitions, run } from './commands.js';
import { askClose, claimTicket, confirmClose, openTicket, verify } from './tickets.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Server Members Intent (Developer Portal → Bot)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Message Content Intent — potrzebne do zapisu ticketów
  ],
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(cfg.token);
  const route = cfg.guildId ? Routes.applicationGuildCommands(cfg.clientId, cfg.guildId) : Routes.applicationCommands(cfg.clientId);
  await rest.put(route, { body: definitions });
  console.log(`[bot] zarejestrowano ${definitions.length} komend (${cfg.guildId ? 'serwer' : 'globalnie'})`);
}

async function presence() {
  try {
    const [p, l] = await Promise.all([Product.countDocuments({ published: true }), License.countDocuments({ status: 'active' })]);
    const list = [`${p} produktów · velorie.market`, `${l} aktywnych licencji`, '/sklep · /licencja'];
    const name = list[Math.floor(Date.now() / 60000) % list.length];
    client.user.setPresence({ activities: [{ name, type: ActivityType.Watching }], status: 'online' });
  } catch (e) {
    console.error('[presence]', e.message);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] zalogowano jako ${c.user.tag}`);
  await registerCommands().catch((e) => console.error('[bot] rejestracja komend', e));
  presence();
  setInterval(presence, 60_000);
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isAutocomplete()) return await autocomplete(i);
    if (i.isChatInputCommand()) return await run(i);
    if (i.isStringSelectMenu() && i.customId === 'ticket:open') return await openTicket(i);
    if (i.isButton()) {
      if (i.customId === 'verify') return await verify(i);
      if (i.customId === 'ticket:claim') return await claimTicket(i);
      if (i.customId === 'ticket:close') return await askClose(i);
      if (i.customId === 'ticket:close:confirm') return await confirmClose(i);
      if (i.customId === 'ticket:close:cancel') return await i.update({ content: 'Anulowano.', components: [] });
    }
  } catch (e) {
    console.error('[interaction]', e);
    const msg = { content: 'Coś poszło nie tak. Spróbuj ponownie za chwilę.', flags: MessageFlags.Ephemeral };
    if (i.isRepliable?.()) {
      if (i.deferred || i.replied) await i.followUp(msg).catch(() => {});
      else await i.reply(msg).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Kupujący wracający na serwer automatycznie odzyskują rolę.
    if (cfg.buyerRole) {
      const has = await License.exists({ discordId: member.id, status: 'active' });
      if (has) await member.roles.add(cfg.buyerRole, 'Posiada aktywną licencję Velorie').catch(() => {});
    }
    if (cfg.welcome) {
      const ch = await member.guild.channels.fetch(cfg.welcome).catch(() => null);
      if (ch?.isTextBased()) {
        const e = new EmbedBuilder()
          .setColor(cfg.color)
          .setTitle(`Witaj na Velorie, ${member.user.globalName || member.user.username}! 👋`)
          .setDescription(`Jesteś naszym **${member.guild.memberCount}.** członkiem.\nSklep: ${cfg.site}\nKomendy: \`/sklep\`, \`/licencja moje\`, \`/pomoc\``)
          .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
          .setTimestamp();
        await ch.send({ content: `<@${member.id}>`, embeds: [e] });
      }
    }
  } catch (e) {
    console.error('[member add]', e);
  }
});

process.on('unhandledRejection', (e) => console.error('[unhandled]', e));
process.on('SIGTERM', () => { client.destroy(); process.exit(0); });

await connect();
await client.login(cfg.token);
