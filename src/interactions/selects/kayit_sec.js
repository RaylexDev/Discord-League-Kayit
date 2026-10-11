const { openForm } = require('../../utils/ticket');

// Panel select menüsü (config.panelMode = 'select')
module.exports = {
  name: 'kayit_sec',
  async execute(interaction) {
    await openForm(interaction, interaction.values[0]);
  },
};
