const config = require('../../../config');
const db = require('../../utils/db');
const ui = require('../../utils/ui');
const E = require('../../utils/emojis');
const { isStaff } = require('../../utils/helpers');
const { sendLog, safeReply, V2 } = require('../../utils/ticket');

const STAT_KEY = { uye: 'uye', kadin: 'kadin', futbolcu: 'futbolcu', teknik: 'td' };

// .k panelindeki rol menüsü: customId `kayit_rol:<kullanici-id>`,
// değer = rol anahtarı (uye / kadin / futbolcu / teknik).
module.exports = {
  name: 'kayit_rol',
  async execute(interaction, args = []) {
    const userId = args[0];
    const roleKey = interaction.values?.[0];
    const settings = db.getGuild(interaction.guildId);

    if (!isStaff(interaction.member, settings)) {
      return safeReply(
        interaction,
        `${E.str('security', interaction.guild)} Bu menüyü sadece Kayıt Yetkilileri kullanabilir.`,
      );
    }

    const roleId = settings.roles?.[roleKey];
    if (!roleId) {
      return safeReply(
        interaction,
        `${E.str('cross', interaction.guild)} Bu tür için rol ayarlanmamış. \`/kayit-kur\` ile tanımla.`,
      );
    }

    // Menü yanıtını hemen onayla (3 sn sınırı)
    await interaction.deferUpdate();

    try {
      const type = Object.values(config.types).find((t) => t.roleKey === roleKey);
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return void (await interaction.editReply({
          components: [
            ui.kayitPanel({
              guild: interaction.guild,
              user: await interaction.client.users.fetch(userId).catch(() => null) ?? { id: userId },
              settings,
              nameNote: `${E.str('cross', interaction.guild)} Kullanıcı sunucuda değil.`,
            }),
          ],
          flags: V2,
          allowedMentions: { parse: [] },
        }));
      }

      await member.roles.add(roleId, `.k ile rol verildi: ${interaction.user.tag}`);

      // Takma ad şablonu: teknik direktör ise "TD | isim", diğerleri düz isim
      const base = String(member.nickname ?? member.user.displayName ?? '')
        .replace(/^TD \| /, '')
        .trim();
      const nick = roleKey === 'teknik' && base ? `TD | ${base}` : base;
      let nickNote = '';
      if (nick && nick !== member.nickname) {
        try {
          await member.setNickname(nick.slice(0, 32), `.k rol: ${interaction.user.tag}`);
        } catch {
          nickNote = ` ${E.str('warning', interaction.guild)} takma ad güncellenemedi.`;
        }
      }

      const statKey = STAT_KEY[roleKey];
      if (statKey) db.addStat(interaction.guildId, interaction.user.id, statKey);

      await sendLog(
        interaction.guild,
        settings,
        `${E.str('check', interaction.guild)} .k ile rol verildi`,
        [
          `**Kullanıcı:** <@${userId}>`,
          `**Rol:** <@&${roleId}> (${type?.label ?? roleKey})`,
          `**Takma ad:** \`${nick || '-'}\``,
          `**Yetkili:** <@${interaction.user.id}>`,
        ],
        config.colors.success,
      );

      await interaction.editReply({
        components: [
          ui.kayitPanel({
            guild: interaction.guild,
            user: member,
            settings,
            givenRole: { roleId, label: type?.label ?? roleKey },
            nameNote: nickNote ? nickNote.trim() : null,
          }),
        ],
        flags: V2,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[kayit_rol]', err);
      await interaction
        .editReply({
          components: [
            ui.kayitPanel({
              guild: interaction.guild,
              user: { id: userId },
              settings,
              nameNote: `${E.str('cross', interaction.guild)} Rol verilemedi: ${err.message}`,
            }),
          ],
          flags: V2,
          allowedMentions: { parse: [] },
        })
        .catch(() => {});
    }
  },
};
