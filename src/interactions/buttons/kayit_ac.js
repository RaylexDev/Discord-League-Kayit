const { openForm } = require('../../utils/ticket');

// Panel butonları: kayit_ac:<tür>
module.exports = {
  name: 'kayit_ac',
  async execute(interaction, args) {
    await openForm(interaction, args[0]);
  },
};
