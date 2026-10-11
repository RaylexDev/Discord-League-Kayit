module.exports = {
  name: 'inviteCreate',
  async execute(invite) {
    const { track } = require('../utils/invites');
    if (!invite.guild) return;
    track(invite.guild, invite.code, {
      uses: invite.uses ?? 0,
      inviterId: invite.inviter?.id ?? null,
    });
  },
};
