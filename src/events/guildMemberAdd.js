const db = require('../utils/db');
const ui = require('../utils/ui');
const { V2 } = require('../utils/ticket');
const invites = require('../utils/invites');
const config = require('../../config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.user.bot) return;
    const settings = db.getGuild(member.guild.id);
    if (!settings.welcomeChannelId) return;

    try {
      const channel =
        member.guild.channels.cache.get(settings.welcomeChannelId) ??
        (await member.guild.channels.fetch(settings.welcomeChannelId));
      if (!channel?.isTextBased()) return;

      const panelUrl = settings.panelChannelId
        ? `https://discord.com/channels/${member.guild.id}/${settings.panelChannelId}`
        : null;

      const inviter = config.welcome.showInviter
        ? await invites.resolveInviter(member.guild).catch(() => null)
        : null;

      await channel.send({
        components: [ui.welcomeMessage(member, { panelUrl, inviter })],
        flags: V2,
        allowedMentions: { users: [member.id] },
      });
    } catch (err) {
      console.error('[guildMemberAdd] Hoş geldin mesajı gönderilemedi:', err.message);
    }
  },
};
