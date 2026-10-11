/**
 * Kayıt (ticket) iş mantığı: ön kontroller, kanal oluşturma, yetki koruması,
 * kapatma ve log gönderme. Tüm buton/modal handler'ları bu modülü kullanır.
 */
const { ChannelType, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const config = require('../../config');
const db = require('./db');
const ui = require('./ui');
const E = require('./emojis');
const { isStaff, isAdmin, slugify, cooldownLeft, setCooldown } = require('./helpers');

const V2 = MessageFlags.IsComponentsV2;
const EPH = MessageFlags.Ephemeral;

const NOT_STAFF = 'Bu işlemi sadece Kayıt Yetkilileri yapabilir!';

/* ---------- Yanıt yardımcıları ---------- */
async function safeReply(interaction, content) {
  const payload = { content, flags: EPH };
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload).catch(() => {});
  }
  return interaction.reply(payload).catch(() => {});
}

/** Ephemeral uyarı mesajına custom emoji ekler. */
const icon = (interaction, key) => E.str(key, interaction.guild);


/* ---------- Yetki koruması (buton + modal submit) ---------- */
/**
 * @param {object} opts
 * @param {boolean} [opts.enforceClaim]
 * @param {string} [opts.ticketChannelId] Başka kanaldan (örn. `.k` paneli)
 *   hedeflenen başvuru kanalı; verilmezse etkileşimin geçtiği kanal kullanılır.
 */
async function guardStaff(interaction, { enforceClaim = true, ticketChannelId } = {}) {
  const ticket = db.getTicket(ticketChannelId || interaction.channelId);
  if (!ticket) {
    await safeReply(interaction, `${icon(interaction, 'cross')} Bu kanal için aktif bir kayıt bulunamadı.`);
    return null;
  }
  const settings = db.getGuild(interaction.guildId);
  if (!isStaff(interaction.member, settings)) {
    await safeReply(interaction, `${icon(interaction, 'security')} ${NOT_STAFF}`);
    return null;
  }
  if (
    enforceClaim &&
    ticket.claimedBy &&
    ticket.claimedBy !== interaction.user.id &&
    !isAdmin(interaction.member)
  ) {
    await safeReply(
      interaction,
      `${icon(interaction, 'claim')} Bu kayıt <@${ticket.claimedBy}> tarafından üstlenildi.`,
    );
    return null;
  }
  return { ticket, settings };
}

/* ---------- Form açmadan / göndermeden önce kontroller ---------- */
async function precheck(interaction, typeKey) {
  const type = config.types[typeKey];
  if (!type) {
    await safeReply(interaction, `${icon(interaction, 'cross')} Geçersiz kayıt türü.`);
    return false;
  }

  if (!config.registerOpen) {
    await safeReply(
      interaction,
      `${icon(interaction, 'lock')} Kayıt sistemi geçici olarak kapalı. ` +
        `Yetkililer \`${config.prefix}k\` komutuyla isim/rol vererek kaydediyor.`,
    );
    return false;
  }

  const settings = db.getGuild(interaction.guildId);
  const roleId = settings.roles?.[type.roleKey];
  if (!settings.staffRoleId || !settings.categoryId || !roleId) {
    await safeReply(
      interaction,
      `${icon(interaction, 'warning')} Kayıt sistemi henüz tam kurulmamış. Lütfen bir yöneticiye bildir.`,
    );
    return false;
  }

  if (interaction.member.roles.cache.has(roleId)) {
    await safeReply(
      interaction,
      `${icon(interaction, 'check')} Zaten **${type.label}** rolüne sahipsin.`,
    );
    return false;
  }

  const existing = db.findOpenTicketByUser(interaction.guildId, interaction.user.id);
  if (existing) {
    if (interaction.guild.channels.cache.has(existing.channelId)) {
      await safeReply(
        interaction,
        `${icon(interaction, 'ticket')} Zaten açık bir kayıt kanalın var: <#${existing.channelId}>`,
      );
      return false;
    }
    db.deleteTicket(existing.channelId); // kanal elle silinmiş, kaydı temizle
  }

  const left = cooldownLeft(`ticket:${interaction.user.id}`);
  if (left > 0) {
    await safeReply(
      interaction,
      `${icon(interaction, 'clock')} Lütfen ${Math.ceil(left / 1000)} saniye bekle.`,
    );
    return false;
  }
  return true;
}

async function openForm(interaction, typeKey) {
  if (!(await precheck(interaction, typeKey))) return;
  await interaction.showModal(ui.formModal(typeKey));
}

/* ---------- Kanal oluşturma ---------- */
async function createRegistration(interaction, typeKey, data) {
  const { guild, user, client } = interaction;
  const type = config.types[typeKey];
  const settings = db.getGuild(guild.id);
  const staffId = settings.staffRoleId;
  const slug = slugify(user.username, user.id);
  const reason = `Kayıt başvurusu: ${user.tag}`;

  const botPerms = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.EmbedLinks, P.ManageChannels, P.Connect];

  let textChannel = null;
  let voiceChannel = null;
  try {
    textChannel = await guild.channels.create({
      name: `${type.channelPrefix}-${slug}`,
      type: ChannelType.GuildText,
      parent: settings.categoryId,
      topic: `Kayıt başvurusu • ${user.tag} • ${type.label}`,
      reason,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
        { id: user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] },
        { id: staffId, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] },
        { id: client.user.id, allow: botPerms },
      ],
    });

    if (type.voice) {
      voiceChannel = await guild.channels.create({
        name: `ses-teyit-${slug}`,
        type: ChannelType.GuildVoice,
        parent: settings.categoryId,
        reason,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [P.ViewChannel, P.Connect] },
          { id: user.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
          { id: staffId, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
          { id: client.user.id, allow: [P.ViewChannel, P.Connect, P.ManageChannels] },
        ],
      });
    }

    const ticket = {
      guildId: guild.id,
      channelId: textChannel.id,
      voiceChannelId: voiceChannel?.id ?? null,
      userId: user.id,
      type: typeKey,
      data,
      claimedBy: null,
      messageId: null,
      createdAt: Date.now(),
    };
    db.createTicket(ticket);

    await textChannel.send({
      content:
        `<@${user.id}> başvurun alındı! <@&${staffId}> yetkilileri en kısa sürede ilgilenecek.` +
        (voiceChannel
          ? `\n${E.str('voice', guild)} Ses teyidi için <#${voiceChannel.id}> odasına katıl.`
          : ''),
      allowedMentions: { users: [user.id], roles: [staffId] },
    });

    const msg = await textChannel.send({
      components: [ui.ticketMessage(ticket, user.displayAvatarURL({ size: 256 }), guild)],
      flags: V2,
      allowedMentions: { parse: [] },
    });
    db.updateTicket(textChannel.id, { messageId: msg.id });

    setCooldown(`ticket:${user.id}`, config.cooldowns.ticketOpenMs);
    await sendLog(
      guild,
      settings,
      `${E.str('ticket', guild)} Yeni kayıt başvurusu`,
      [
        `**Kullanıcı:** <@${user.id}> (${user.tag})`,
        `**Tür:** ${E.str(type.emojiKey, guild)} ${type.label}`,
        `**Kanal:** <#${textChannel.id}>`,
      ],
      config.colors.success,
    );
    return textChannel;
  } catch (err) {
    if (textChannel) db.deleteTicket(textChannel.id);
    await textChannel?.delete('Kayıt oluşturma hatası').catch(() => {});
    await voiceChannel?.delete('Kayıt oluşturma hatası').catch(() => {});
    throw err;
  }
}

/* ---------- Yardımcılar ---------- */
/** Başvuru kanalını (cache ya da fetch) döndürür. */
async function ticketChannel(guild, ticket) {
  return (
    guild.channels.cache.get(ticket.channelId) ??
    (await guild.channels.fetch(ticket.channelId).catch(() => null))
  );
}

/* ---------- Mesaj güncelleme ---------- */
async function refreshTicketMessage(ticket, guild) {
  if (!ticket?.messageId) return;
  const channel = await ticketChannel(guild, ticket);
  if (!channel?.isTextBased()) return;
  const user = await guild.client.users.fetch(ticket.userId).catch(() => null);
  const msg = await channel.messages.fetch(ticket.messageId).catch(() => null);
  if (!msg) return;
  await msg
    .edit({
      components: [ui.ticketMessage(ticket, user?.displayAvatarURL({ size: 256 }), guild)],
      flags: V2,
      allowedMentions: { parse: [] },
    })
    .catch((e) => console.error('[ticket] mesaj güncellenemedi:', e.message));
}

/* ---------- Kapatma ---------- */
function closeTicket(guild, ticket, delayMs = config.closeDelayMs) {
  db.deleteTicket(ticket.channelId);
  setTimeout(async () => {
    for (const id of [ticket.channelId, ticket.voiceChannelId].filter(Boolean)) {
      const ch = guild.channels.cache.get(id) ?? (await guild.channels.fetch(id).catch(() => null));
      await ch?.delete('Kayıt işlemi tamamlandı').catch(() => {});
    }
  }, delayMs);
}

/* ---------- Log ---------- */
async function sendLog(guild, settings, title, lines, color) {
  if (!settings.logChannelId) return;
  try {
    const ch = guild.channels.cache.get(settings.logChannelId) ?? (await guild.channels.fetch(settings.logChannelId));
    await ch?.send({
      components: [ui.logMessage(title, lines, color)],
      flags: V2,
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('[log] gönderilemedi:', err.message);
  }
}

module.exports = {
  NOT_STAFF,
  V2,
  EPH,
  safeReply,
  guardStaff,
  precheck,
  openForm,
  createRegistration,
  ticketChannel,
  refreshTicketMessage,
  closeTicket,
  sendLog,
};
