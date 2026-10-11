const config = require('../../../config');
const db = require('../../utils/db');
const { tryLock, unlock } = require('../../utils/helpers');
const { guardStaff, closeTicket, sendLog, safeReply } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// Onayla: rol ver, takma adı güncelle, istatistiğe ekle, kanalları sil
module.exports = {
  name: 'kayit_onay',
  async execute(interaction, args = []) {
    const guarded = await guardStaff(interaction, { ticketChannelId: args[0] });
    if (!guarded) return;
    const { ticket, settings } = guarded;

    if (!tryLock(ticket.channelId)) {
      return safeReply(interaction, `${E.str('clock', interaction.guild)} Bu başvuru şu anda işleniyor.`);
    }

    try {
      await interaction.deferReply();
      const type = config.types[ticket.type];
      const roleId = settings.roles?.[type.roleKey];
      if (!roleId) {
        return void (await interaction.editReply(`${E.str('cross', interaction.guild)} Bu tür için rol ayarlanmamış. `/kayit-kur` komutunu tekrar çalıştır.`));
      }

      const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
      if (!member) {
        await interaction.editReply(`${E.str('cross', interaction.guild)} Kullanıcı sunucudan ayrılmış. Kanal kapatılıyor.`);
        closeTicket(interaction.guild, ticket);
        return;
      }

      await member.roles.add(roleId, `Kayıt onayı: ${interaction.user.tag}`);

      const nick = String(type.nick(ticket.data)).slice(0, 32);
      let nickNote = '';
      try {
        await member.setNickname(nick, `Kayıt onayı: ${interaction.user.tag}`);
      } catch {
        nickNote = `\n${E.str('warning', interaction.guild)} Takma ad değiştirilemedi (bot rolü yeterince yukarıda değil olabilir).`;
      }

      db.addStat(interaction.guildId, interaction.user.id, ticket.type);

      await sendLog(
        interaction.guild,
        settings,
        `${E.str('check', interaction.guild)} Kayıt onaylandı`,
        [
          `**Kullanıcı:** <@${ticket.userId}>`,
          `**Tür:** ${E.str(type.emojiKey, interaction.guild)} ${type.label}`,
          `**Takma ad:** \`${nick}\``,
          `**Yetkili:** <@${interaction.user.id}>`,
        ],
        config.colors.success,
      );

      await interaction.editReply({
        content:
          `${E.str('check', interaction.guild)} <@${ticket.userId}> kaydı **${interaction.user}** tarafından onaylandı. ` +
          `**${type.label}** rolü verildi.${nickNote}\n-# Kanal ${Math.round(config.closeDelayMs / 1000)} saniye içinde silinecek.`,
        allowedMentions: { parse: [] },
      });
      closeTicket(interaction.guild, ticket);
    } catch (err) {
      console.error('[kayit_onay]', err);
      await interaction
        .editReply(`${E.str('cross', interaction.guild)} Onay sırasında hata oluştu. Botun rol yönetme yetkisini ve rol sırasını kontrol et.`)
        .catch(() => {});
    } finally {
      unlock(ticket.channelId);
    }
  },
};
