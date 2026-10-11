// Hızlı işlem menüsü: seçilen değer bir butonun customId'sidir;
// aynı buton mantığı üzerinden çalıştırılır.
module.exports = {
  name: 'kayit_hizli',
  async execute(interaction) {
    const target = interaction.values?.[0];
    const handler = target && interaction.client.buttons.get(target);
    if (!handler) return;
    await handler.execute(interaction, [interaction.channelId], interaction.client);
  },
};
