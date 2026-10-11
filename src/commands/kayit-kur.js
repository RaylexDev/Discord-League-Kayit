const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const db = require('../utils/db');
const ui = require('../utils/ui');
const config = require('../../config');
const { V2 } = require('../utils/ticket');
const E = require('../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kayit-kur')
    .setDescription(`${config.serverName} kayıt başvuru panelini kurar.`)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Zorunlu seçenekler
    .addChannelOption((o) =>
      o.setName('kanal').setDescription('Panelin gönderileceği kanal').addChannelTypes(ChannelType.GuildText).setRequired(true),
    )
    .addRoleOption((o) => o.setName('yetkili-rol').setDescription('Kayıt yetkilisi rolü').setRequired(true))
    .addChannelOption((o) =>
      o.setName('kategori').setDescription('Kayıt kanallarının açılacağı kategori').addChannelTypes(ChannelType.GuildCategory).setRequired(true),
    )
    .addRoleOption((o) => o.setName('uye-rol').setDescription('Üye rolü').setRequired(true))
    .addRoleOption((o) => o.setName('kadin-rol').setDescription('Kadın Üye rolü').setRequired(true))
    .addRoleOption((o) => o.setName('futbolcu-rol').setDescription('Futbolcu rolü').setRequired(true))
    .addRoleOption((o) => o.setName('teknik-rol').setDescription('Teknik Direktör rolü').setRequired(true))
    // Opsiyonel seçenekler
    .addChannelOption((o) =>
      o.setName('hosgeldin-kanal').setDescription('Hoş geldin mesajı kanalı').addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption((o) =>
      o.setName('log-kanal').setDescription('Kayıt loglarının gideceği kanal').addChannelTypes(ChannelType.GuildText),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild = interaction.guild;
      const panelChannel = interaction.options.getChannel('kanal', true);
      const staffRole = interaction.options.getRole('yetkili-rol', true);
      const category = interaction.options.getChannel('kategori', true);
      const roles = {
        uye: interaction.options.getRole('uye-rol', true),
        kadin: interaction.options.getRole('kadin-rol', true),
        futbolcu: interaction.options.getRole('futbolcu-rol', true),
        teknik: interaction.options.getRole('teknik-rol', true),
      };
      const welcomeChannel = interaction.options.getChannel('hosgeldin-kanal');
      const logChannel = interaction.options.getChannel('log-kanal');

      // Uyarılar: rol sırası / yetki
      const warnings = [];
      const me = guild.members.me;
      for (const [key, role] of Object.entries(roles)) {
        if (role.managed || role.id === guild.roles.everyone.id) {
          warnings.push(`${E.str('warning', guild)} **${role.name}** rolü atanamaz (bot/everyone rolü).`);
        } else if (me.roles.highest.comparePositionTo(role) <= 0) {
          warnings.push(`${E.str('warning', guild)} Botun rolü **${role.name}** (${key}) rolünün üstünde değil; rol verilemez.`);
        }
      }
      const needed = ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageRoles', 'ManageNicknames'];
      const missing = needed.filter((p) => !me.permissions.has(PermissionFlagsBits[p]));
      if (missing.length) warnings.push(`${E.str('warning', guild)} Botta eksik yetkiler: ${missing.join(', ')}`);

      // Paneli gönder
      const panel = await panelChannel.send({
        components: [ui.panelMessage(guild)],
        flags: V2,
        allowedMentions: { parse: [] },
      });

      db.setGuild(guild.id, {
        panelChannelId: panelChannel.id,
        panelMessageId: panel.id,
        staffRoleId: staffRole.id,
        categoryId: category.id,
        welcomeChannelId: welcomeChannel?.id ?? db.getGuild(guild.id).welcomeChannelId ?? null,
        logChannelId: logChannel?.id ?? db.getGuild(guild.id).logChannelId ?? null,
        roles: {
          uye: roles.uye.id,
          kadin: roles.kadin.id,
          futbolcu: roles.futbolcu.id,
          teknik: roles.teknik.id,
        },
      });

      const st = E.status(guild);
      await interaction.editReply({
        content:
          `${E.str('check', guild)} Kayıt paneli ${panelChannel} kanalına kuruldu.\n` +
          `• Yetkili rolü: ${staffRole}\n• Kategori: ${category}\n` +
          `• Hoş geldin kanalı: ${welcomeChannel ?? 'ayarlanmadı'}\n• Log kanalı: ${logChannel ?? 'ayarlanmadı'}` +
          (!config.registerOpen
            ? `\n\n${E.str('lock', guild)} **Kayıt paneli sistem olarak kapalı** ` +
              `(\`config.js → registerOpen\`). Panel kilitli görünür; şimdilik ` +
              `kayıt \`${config.prefix}k\` ile yapılır.`
            : '') +
          (st.missing
            ? `\n\n${E.str('warning', guild)} ${st.missing}/${st.total} emoji henüz kurulu değil. ` +
              `Panelde ikonların görünmesi için \`/emojikur\` çalıştır.`
            : '') +
          (warnings.length ? `\n\n${warnings.join('\n')}` : ''),
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[kayit-kur]', err);
      await interaction
        .editReply(
          `${E.str('cross', interaction.guild)} Panel kurulamadı. ` +
            `Botun o kanalda mesaj gönderme yetkisi olduğundan emin ol.`,
        )
        .catch(() => {});
    }
  },
};
