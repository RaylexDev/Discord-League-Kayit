const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../config');
const E = require('../utils/emojis');
const ui = require('../utils/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojikur')
    .setDescription('Emoji kütüphanesinden sunucuya custom emoji kurar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDMPermission(false),

  async execute(interaction) {
    const guild = interaction.guild;
    const before = E.status(guild);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panel = await interaction
      .editReply({
        components: [
          ui.installPanel({
            title: `${E.str('settings', guild)} Emoji kurulumu başlatılıyor`,
            lines: [
              `> **Kütüphane:** yerel emoji kütüphanesi  •  **Önek:** \`${config.emojiler.prefix}<anahtar>\``,
              `> **Eksik:** ${before.missing} / ${before.total}  •  **Sunucu limiti:** ${before.limit}`,
              `> **Bu sunucudaki kurulu:** ${before.installed}`,
            ],
            phase: 'loading',
            color: config.colors.info,
            thumbUrl: interaction.client.user.displayAvatarURL({ size: 256 }),
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      })
      .catch(() => null);

    if (!panel) return;

    let last = 0;
    const result = await E.install(guild, {
      onProgress: async (p) => {
        if (Date.now() - last < 3000) return;
        last = Date.now();
        await interaction
          .editReply({
            components: [
              ui.installPanel({
                title: `${E.str('settings', guild)} Emoji kurulumu sürüyor`,
                lines: [
                  `> **İlerleme:** ${p.done}/${p.total}  •  **Yüklendi:** ${p.uploaded}  ` +
                    `•  **Hazır:** ${p.reused}  •  **Limit:** ${p.limited}`,
                  `> **Şu an:** \`${config.emojiler.prefix}${p.key}\` — ${p.status}`,
                ],
                phase: 'loading',
                color: config.colors.info,
                thumbUrl: interaction.client.user.displayAvatarURL({ size: 256 }),
              }),
            ],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
      },
    });

    const after = E.status(guild);
    const lines = [
      `> **Yeni yüklenen:** ${result.uploaded}  •  **Zaten vardı:** ${result.reused}`,
      `> **Limit dolduğu için atlanan:** ${result.limited}  •  **Hata:** ${result.failed.length}`,
      `> **Toplam kurulu:** ${after.installed}/${after.total}  •  **Emoji limiti:** ${after.limit}`,
    ];
    if (result.failed.length) {
      lines.push(
        `> **Başarısız:** ${result.failed.map((f) => `\`${f.key}\``).join(', ').slice(0, 400)}`,
      );
    }
    if (after.missing > 0) {
      lines.push(
        `-# ${E.str('info', guild)} Eksikler sunucu emoji limitine takıldı; boost ile limit büyüyünce ` +
          `tekrar çalıştırın. Kurulmayan ikonlar tipografik yedekle gösterilir.`,
      );
    }

    await interaction
      .editReply({
        components: [
          ui.installPanel({
            title: `${E.str('check', guild)} Emoji kurulumu tamamlandı`,
            lines,
            phase: 'done',
            color: result.failed.length ? config.colors.warning : config.colors.success,
            thumbUrl: interaction.client.user.displayAvatarURL({ size: 256 }),
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
  },
};
