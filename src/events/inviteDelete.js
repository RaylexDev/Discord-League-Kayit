module.exports = {
  name: 'inviteDelete',
  async execute(invite) {
    const { untrack } = require('../utils/invites');
    if (!invite.guild) return;
    untrack(invite.guild, invite.code);
  },
};
