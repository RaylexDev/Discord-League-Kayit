const config = require('../../../config');
const db = require('../../utils/db');
const { sanitize } = require('../../utils/helpers');
const { guardStaff, refreshTicketMessage, sendLog, safeReply, EPH } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// İsim değiştirme modalı gönderildi
module.exports = {
  name: 'kayit_isim_modal',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, { ticketChannelId: args[0] });
    if (!guarded) return;
    const { ticket, settings } = guarded;

    const type = config.types[ticket.type];
    const field = type.fields.find((f) => f.id === 'isim');
    const name = sanitize(interaction.fields.getTextInputValue('isim'), field.max);

    if (name.length < 2 || !field.pattern.test(name)) {
      return safeReply(interaction, `${E.str('cross', interaction.guild)} Geçersiz isim. Yalnızca harf/rakam ve basit işaretler kullanılabilir.`);
    }

    await interaction.deferReply({ flags: EPH });

    const old = ticket.data.isim;
    const updated = db.updateTicket(ticket.channelId, {
      data: { ...ticket.data, isim: name },
      prefillName: null, // `.k` ile verilen hazır isim kullanıldı
    });
    await refreshTicketMessage(updated, interaction.guild);

    // Kullanıcı sunucudaysa takma adı hemen güncelle
    const nick = String(type.nick(updated.data)).slice(0, 32);
    let note = '';
    const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
    if (member) {
      try {
        await member.setNickname(nick, `İsim değişikliği: ${interaction.user.tag}`);
      } catch {
        note = `\n${E.str('warning', interaction.guild)} Takma ad değiştirilemedi (bot rolü yeterince yukarıda değil olabilir); onayda tekrar denenecek.`;
      }
    }

    await sendLog(interaction.guild, settings, `${E.str('settings', interaction.guild)} İsim değiştirildi`, [
      `**Kullanıcı:** <@${ticket.userId}>`,
      `**Eski:** ${old} → **Yeni:** ${name}`,
      `**Yetkili:** <@${interaction.user.id}>`,
    ]);

    await interaction.editReply(`${E.str('settings', interaction.guild)} İsim güncellendi: **${old}** → **${name}**\nTakma ad: \`${nick}\`${note}`);
  },
};
