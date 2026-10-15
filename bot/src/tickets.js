import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} from 'discord.js';
import { cfg } from './config.js';
import { BotTicket, License, nextSeq } from './db.js';
import { TICKET_CATEGORIES } from './commands.js';

const eph = { flags: MessageFlags.Ephemeral };
const isStaff = (member) =>
  member.permissions.has(PermissionFlagsBits.ManageGuild) || (cfg.supportRole && member.roles.cache.has(cfg.supportRole));

/** Wybór kategorii z panelu → prywatny kanał ticketu. */
export async function openTicket(i) {
  const category = i.values[0];
  const cat = TICKET_CATEGORIES.find((c) => c.value === category) || TICKET_CATEGORIES.at(-1);
  await i.deferReply(eph);

  const existing = await BotTicket.findOne({ guildId: i.guildId, userId: i.user.id, status: 'open' }).lean();
  if (existing && i.guild.channels.cache.has(existing.channelId)) {
    return i.editReply({ content: `Masz już otwarty ticket: <#${existing.channelId}>` });
  }

  const number = await nextSeq('bot-ticket');
  const name = `ticket-${String(number).padStart(4, '0')}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
  const overwrites = [
    { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: i.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (cfg.supportRole) overwrites.push({ id: cfg.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });

  const channel = await i.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: cfg.ticketCategory || undefined,
    topic: `Ticket #${number} · ${cat.label} · użytkownik ${i.user.id}`,
    permissionOverwrites: overwrites,
  });
  await BotTicket.create({ number, guildId: i.guildId, channelId: channel.id, userId: i.user.id, category: cat.value });

  const lics = await License.countDocuments({ discordId: i.user.id, status: 'active' });
  const e = new EmbedBuilder()
    .setColor(cfg.color)
    .setTitle(`${cat.emoji} Ticket #${number} — ${cat.label}`)
    .setDescription(`Cześć <@${i.user.id}>! Opisz problem, a zespół odpowie najszybciej, jak to możliwe.\n\n• numer zamówienia lub końcówka klucza\n• wersja serwera i framework\n• logi z konsoli`)
    .addFields({ name: 'Aktywne licencje', value: String(lics), inline: true })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Przejmij').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Zamknij').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  await channel.send({ content: `<@${i.user.id}>${cfg.supportRole ? ` <@&${cfg.supportRole}>` : ''}`, embeds: [e], components: [row] });
  await i.editReply({ content: `Ticket utworzony: ${channel}` });
}

export async function claimTicket(i) {
  if (!isStaff(i.member)) return i.reply({ content: 'Tylko zespół wsparcia może przejąć ticket.', ...eph });
  await BotTicket.updateOne({ channelId: i.channelId }, { $set: { claimedBy: i.user.id } });
  await i.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`🙋 Ticket przejął(a) <@${i.user.id}>.`)] });
}

export async function askClose(i) {
  const t = await BotTicket.findOne({ channelId: i.channelId }).lean();
  if (!t) return i.reply({ content: 'To nie jest kanał ticketu.', ...eph });
  if (t.userId !== i.user.id && !isStaff(i.member)) return i.reply({ content: 'Nie możesz zamknąć tego ticketu.', ...eph });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close:confirm').setLabel('Tak, zamknij').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:close:cancel').setLabel('Anuluj').setStyle(ButtonStyle.Secondary),
  );
  await i.reply({ content: 'Na pewno zamknąć ticket? Kanał zostanie usunięty, a zapis rozmowy trafi do logów.', components: [row], ...eph });
}

async function transcript(channel) {
  const all = [];
  let before;
  for (let n = 0; n < 10; n++) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
  }
  return all
    .reverse()
    .map((m) => {
      const extra = [...m.attachments.values()].map((a) => ` [załącznik: ${a.url}]`).join('');
      const emb = m.embeds.map((e) => ` [embed: ${e.title || ''} ${e.description || ''}]`).join('');
      return `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}${extra}${emb}`;
    })
    .join('\n');
}

export async function confirmClose(i) {
  const t = await BotTicket.findOne({ channelId: i.channelId });
  if (!t) return i.update({ content: 'Ticket nie istnieje.', components: [] });
  await i.update({ content: 'Zamykam ticket… 🔒', components: [] });
  t.status = 'closed';
  t.closedBy = i.user.id;
  await t.save();
  try {
    const text = await transcript(i.channel);
    const file = new AttachmentBuilder(Buffer.from(text || '(pusto)', 'utf8'), { name: `ticket-${t.number}.txt` });
    const summary = new EmbedBuilder()
      .setColor(0xfb7185)
      .setTitle(`Ticket #${t.number} zamknięty`)
      .addFields(
        { name: 'Autor', value: `<@${t.userId}>`, inline: true },
        { name: 'Kategoria', value: t.category || '—', inline: true },
        { name: 'Zamknął', value: `<@${i.user.id}>`, inline: true },
        { name: 'Przejął', value: t.claimedBy ? `<@${t.claimedBy}>` : '—', inline: true },
      )
      .setTimestamp();
    if (cfg.ticketLog) {
      const log = await i.client.channels.fetch(cfg.ticketLog).catch(() => null);
      if (log?.isTextBased()) await log.send({ embeds: [summary], files: [file] });
    }
    const user = await i.client.users.fetch(t.userId).catch(() => null);
    await user?.send({ content: `Twój ticket #${t.number} na Velorie został zamknięty. Dzięki za kontakt! Zapis rozmowy w załączniku.`, files: [new AttachmentBuilder(Buffer.from(text || '', 'utf8'), { name: `ticket-${t.number}.txt` })] }).catch(() => {});
  } catch (e) {
    console.error('[ticket] transkrypcja', e);
  }
  await i.channel.send('Kanał zostanie usunięty za 5 sekund.');
  setTimeout(() => i.channel.delete(`Ticket #${t.number} zamknięty`).catch(() => {}), 5000);
}

export async function verify(i) {
  if (!cfg.verifiedRole) return i.reply({ content: 'Weryfikacja nie jest skonfigurowana.', ...eph });
  if (i.member.roles.cache.has(cfg.verifiedRole)) return i.reply({ content: 'Jesteś już zweryfikowany ✅', ...eph });
  await i.member.roles.add(cfg.verifiedRole, 'Weryfikacja przyciskiem');
  await i.reply({ content: 'Gotowe! Masz dostęp do serwera ✅', ...eph });
}
