const E = require('../../utils/emojis');
const { guardStaff, closeTicket, sendLog, safeReply, EPH } = require('../../utils/ticket');
const config = require('../../../config');

// .k panelindeki "Başvuru Kanalını Kapat" — customId: kayit_kapat:<kanal-id>
module.exports = {
  name: 'kayit_kapat',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, {
      enforceClaim: false,
      ticketChannelId: args[0],
    });
    if (!guarded) return;
    const { ticket, settings } = guarded;

    await interaction.deferReply({ flags: EPH });

    await sendLog(
      interaction.guild,
      settings,
      `${E.str('delete', interaction.guild)} Başvuru kanalı kapatıldı`,
      [
        `**Kullanıcı:** <@${ticket.userId}>`,
        `**Tür:** ${config.types[ticket.type]?.label ?? ticket.type}`,
        `**Kapatan:** <@${interaction.user.id}>`,
      ],
      config.colors.warning,
    );

    await interaction
      .editReply({
        content: `${E.str('check', interaction.guild)} Başvuru kanalı kapatılıyor...`,
        allowedMentions: { parse: [] },
      })
      .catch(() => {});

    closeTicket(interaction.guild, ticket);
  },
};
