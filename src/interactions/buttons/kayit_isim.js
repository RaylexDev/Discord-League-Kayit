const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../../config');
const { guardStaff } = require('../../utils/ticket');

// İsim Değiş: yetkili için hızlı isim modalı
module.exports = {
  name: 'kayit_isim',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, { ticketChannelId: args[0] });
    if (!guarded) return;
    const { ticket } = guarded;
    const field = config.types[ticket.type].fields.find((f) => f.id === 'isim');
    const prefill = String(ticket.prefillName ?? ticket.data.isim ?? '').slice(0, field.max);

    const modal = new ModalBuilder()
      .setCustomId(`kayit_isim_modal:${ticket.channelId}`)
      .setTitle('İsmi Değiştir');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('isim')
          .setLabel('Yeni isim')
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(field.max)
          .setValue(prefill)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
  },
};
