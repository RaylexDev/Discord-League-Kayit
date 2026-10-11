const config = require('../../../config');
const db = require('../../utils/db');
const { sanitize, tryLock, unlock } = require('../../utils/helpers');
const { guardStaff, closeTicket, sendLog, safeReply } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// Red sebebi gönderildi
module.exports = {
  name: 'kayit_red_modal',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, { ticketChannelId: args[0] });
    if (!guarded) return;
    const { ticket, settings } = guarded;

    if (!tryLock(ticket.channelId)) {
      return safeReply(interaction, `${E.str('clock', interaction.guild)} Bu başvuru şu anda işleniyor.`);
    }

    // DM + log biraz sürebilir; 3 saniye sınırını geçmemek için hemen onayla
    await interaction.deferReply();

    try {
      const reason = sanitize(interaction.fields.getTextInputValue('sebep'), 200) || 'Belirtilmedi';
      const type = config.types[ticket.type];

      // Kullanıcıya DM (kapalıysa sessizce geç)
      const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
      await user
        ?.send(
          `${E.str('cross', interaction.guild)} **${config.serverName}** — ${type.label} başvurun reddedildi.\n**Sebep:** ${reason}\nİstersen formu düzeltip tekrar başvurabilirsin.`,
        )
        .catch(() => {});

      await sendLog(
        interaction.guild,
        settings,
        `${E.str('cross', interaction.guild)} Kayıt reddedildi`,
        [
          `**Kullanıcı:** <@${ticket.userId}>`,
          `**Tür:** ${E.str(type.emojiKey, interaction.guild)} ${type.label}`,
          `**Sebep:** ${reason}`,
          `**Yetkili:** <@${interaction.user.id}>`,
        ],
        config.colors.danger,
      );

      await interaction.editReply({
        content:
          `${E.str('cross', interaction.guild)} <@${ticket.userId}> başvurusu **${interaction.user}** tarafından reddedildi.\n**Sebep:** ${reason}\n` +
          `-# Kanal ${Math.round(config.closeDelayMs / 1000)} saniye içinde silinecek.`,
        allowedMentions: { parse: [] },
      });
      closeTicket(interaction.guild, ticket);
    } catch (err) {
      console.error('[kayit_red_modal]', err);
      await interaction
        .editReply({
          content: `${E.str('cross', interaction.guild)} Red işlemi sırasında hata oluştu; kanal kapatılmadı.`,
          allowedMentions: { parse: [] },
        })
        .catch(() => {});
    } finally {
      unlock(ticket.channelId);
    }
  },
};
