const { MessageFlags } = require('discord.js');
const E = require('../utils/emojis');

async function route(collection, interaction) {
  const [name, ...args] = interaction.customId.split(':');
  const handler = collection.get(name);
  if (!handler) return;
  await handler.execute(interaction, args, interaction.client);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.inGuild()) return;

    try {
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (cmd) await cmd.execute(interaction, client);
      } else if (interaction.isButton()) {
        await route(client.buttons, interaction);
      } else if (interaction.isStringSelectMenu()) {
        await route(client.selects, interaction);
      } else if (interaction.isModalSubmit()) {
        await route(client.modals, interaction);
      }
    } catch (err) {
      console.error('[interactionCreate]', err);
      const payload = {
        content: `${E.str('cross', interaction.guild)} İşlem sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.`,
        allowedMentions: { parse: [] },
        flags: MessageFlags.Ephemeral,
      };
      try {
        if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch {}
    }
  },
};
