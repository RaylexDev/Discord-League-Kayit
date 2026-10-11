const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/db');
const ui = require('../utils/ui');
const { isStaff } = require('../utils/helpers');
const E = require('../utils/emojis');

const sum = (c) => Object.values(c).reduce((a, b) => a + b, 0);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kstat')
    .setDescription('Bir yetkilinin kayıt istatistiklerini gösterir.')
    .setDMPermission(false)
    .addUserOption((o) => o.setName('yetkili').setDescription('İstatistiği görülecek yetkili (boşsa kendin)')),

  async execute(interaction) {
    const settings = db.getGuild(interaction.guildId);
    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({
        content: `${E.str('security', interaction.guild)} Bu işlemi sadece Kayıt Yetkilileri yapabilir!`,
        allowedMentions: { parse: [] },
        flags: MessageFlags.Ephemeral,
      });
    }

    const target = interaction.options.getUser('yetkili') ?? interaction.user;
    const stat = db.getStat(interaction.guildId, target.id);

    const ranked = db
      .getAllStats(interaction.guildId)
      .filter((s) => sum(s.weekly) > 0)
      .sort((a, b) => sum(b.weekly) - sum(a.weekly));
    const idx = ranked.findIndex((s) => s.id === target.id);

    await interaction.reply({
      components: [ui.statsMessage(target, stat, idx >= 0 ? idx + 1 : null, interaction.guild)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
