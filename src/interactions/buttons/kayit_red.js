const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { guardStaff } = require('../../utils/ticket');

// Reddet: sebep sormak için modal açar
module.exports = {
  name: 'kayit_red',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, { ticketChannelId: args[0] });
    if (!guarded) return;

    const modal = new ModalBuilder()
      .setCustomId(`kayit_red_modal:${guarded.ticket.channelId}`)
      .setTitle('Başvuruyu Reddet');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sebep')
          .setLabel('Red sebebi')
          .setPlaceholder('Örn: Geçersiz isim formatı')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(200)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
  },
};
