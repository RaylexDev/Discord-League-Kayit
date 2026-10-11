const db = require('../../utils/db');
const { guardStaff, refreshTicketMessage, ticketChannel } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// Üstlen: kaydı yetkili üzerine alır, mesajı günceller
module.exports = {
  name: 'kayit_ustlen',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, {
      enforceClaim: false,
      ticketChannelId: args[0],
    });
    if (!guarded) return;
    const { ticket } = guarded;

    if (ticket.claimedBy) {
      return interaction.reply({
        content: `${E.str('claim', interaction.guild)} Bu kayıt zaten <@${ticket.claimedBy}> tarafından üstlenildi.`,
        flags: 64,
        allowedMentions: { parse: [] },
      });
    }

    const updated = db.updateTicket(ticket.channelId, { claimedBy: interaction.user.id });
    await interaction.deferUpdate();
    await refreshTicketMessage(updated, interaction.guild);
    const channel = await ticketChannel(interaction.guild, ticket);
    await channel
      ?.send({
        content: `${E.str('claim', interaction.guild)} Bu kayıt **${interaction.user}** yetkilisi tarafından üstlenildi.`,
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
  },
};
