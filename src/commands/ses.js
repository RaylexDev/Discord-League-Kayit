const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const E = require('../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ses')
    .setDescription('Botu ses kanalına sokar (kanal boş bırakılırsa çıkarır).')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .setDMPermission(false)
    .addChannelOption((o) =>
      o
        .setName('kanal')
        .setDescription('Bağlanılacak ses kanalı (boş bırakırsan çıkar)')
        .addChannelTypes(ChannelType.GuildVoice),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const channel = interaction.options.getChannel('kanal');

    if (!channel) {
      const conn = getVoiceConnection(guild.id);
      if (!conn) {
        return interaction.reply({
          content: `${E.str('info', guild)} Bot zaten seste değil. Bağlanmak için \`/ses kanal:...\` yaz.`,
          ephemeral: true,
        });
      }
      conn.destroy();
      return interaction.reply({
        content: `${E.str('check', guild)} Bot ses kanalından çıkarıldı.`,
        ephemeral: true,
      });
    }

    joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    await interaction.reply({
      content: `${E.str('voice', guild)} Bot **${channel.name}** ses kanalına bağlandı.`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
};
