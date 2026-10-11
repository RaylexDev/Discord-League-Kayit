// .k panelindeki işlem menüsü: customId `kayit_hedef:<başvuru-kanal-id>`,
// seçim değeri çalıştırılacak butonun adıdır (onay/red/isim/ustlen/cagir).
module.exports = {
  name: 'kayit_hedef',
  async execute(interaction, args = []) {
    const channelId = args[0];
    const action = interaction.values?.[0];
    const handler = channelId && action && interaction.client.buttons.get(action);
    if (!handler) return;
    await handler.execute(interaction, [channelId], interaction.client);
  },
};
