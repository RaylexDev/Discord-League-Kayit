const config = require('../../../config');
const db = require('../../utils/db');
const { cooldownLeft, setCooldown, isStaff } = require('../../utils/helpers');
const { safeReply } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// Yetkili Çağır: başvuru sahibi veya yetkili kullanabilir (cooldown'lu)
module.exports = {
  name: 'kayit_cagir',
  async execute(interaction, args = []) {
    const ticket = db.getTicket(args[0] || interaction.channelId);
    if (!ticket) return safeReply(interaction, `${E.str('cross', interaction.guild)} Aktif bir kayıt bulunamadı.`);

    const settings = db.getGuild(interaction.guildId);
    const isApplicant = ticket.userId === interaction.user.id;
    if (!isApplicant && !isStaff(interaction.member, settings)) {
      return safeReply(interaction, `${E.str('security', interaction.guild)} Bu butonu sadece başvuru sahibi veya yetkililer kullanabilir.`);
    }

    const key = `call:${ticket.channelId}`;
    const left = cooldownLeft(key);
    if (left > 0) {
      return safeReply(interaction, `${E.str('clock', interaction.guild)} Yetkilileri tekrar çağırmak için ${Math.ceil(left / 1000)} saniye bekle.`);
    }
    setCooldown(key, config.cooldowns.callStaffMs);

    const mention = ticket.claimedBy ? `<@${ticket.claimedBy}>` : `<@&${settings.staffRoleId}>`;

    await interaction.reply({
      content: `${E.str('bell', interaction.guild)} ${mention}, <@${ticket.userId}> kaydı için yetkili bekliyor!`,
      allowedMentions: ticket.claimedBy
        ? { users: [ticket.claimedBy] }
        : { roles: [settings.staffRoleId] },
    });
  },
};
