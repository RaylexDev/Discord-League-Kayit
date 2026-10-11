const db = require('../utils/db');

// Kayıt kanalı elle silinirse veritabanındaki kaydı temizle (kullanıcı kilitli kalmasın)
module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    try {
      if (db.getTicket(channel.id)) db.deleteTicket(channel.id);
    } catch (err) {
      console.error('[channelDelete]', err);
    }
  },
};
