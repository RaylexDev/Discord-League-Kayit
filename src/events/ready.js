const config = require('../../config');
const E = require('../utils/emojis');
const invites = require('../utils/invites');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(
      `[bot] ${client.user.tag} olarak giriş yapıldı. ${client.guilds.cache.size} sunucuda aktif.`,
    );
    client.user.setPresence({
      activities: [{ name: `${config.serverName}` }],
      status: 'dnd',
    });
    try {
      const body = [...client.commands.values()].map((c) => c.data.toJSON());
      const guildId = process.env.GUILD_ID;
      if (guildId) {
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
        await guild.commands.set(body);
        console.log(`[bot] ${body.length} komut sunucuya (${guildId}) kaydedildi.`);
      } else {
        await client.application.commands.set(body);
        console.log(`[bot] ${body.length} komut global olarak kaydedildi.`);
      }
    } catch (err) {
      console.error('[bot] Komutlar kaydedilemedi:', err.message);
    }

    // Davet kullanım sayılarını anlık tut ("davet eden" bilgisi için)
    await invites.snapshotAll(client).catch((err) =>
      console.error('[invite] anlık görüntü alınamadı:', err.message),
    );

    // Eksik emojileri kütüphaneden arka planda kur
    if (config.emojiler.autoInstall) {
      for (const guild of client.guilds.cache.values()) {
        try {
          const st = E.status(guild);
          if (st.missing === 0) {
            console.log(`[emoji] ${guild.name}: tüm emojiler kurulu (${st.installed}/${st.total})`);
            continue;
          }
          console.log(`[emoji] ${guild.name}: ${st.missing} eksik emoji kuruluyor...`);
          const r = await E.install(guild, {
            onProgress: (p) => {
              if (p.status === 'failed') {
                console.error(`[emoji] ${guild.name}: ${p.key} yüklenemedi`);
              }
            },
          });
          console.log(
            `[emoji] ${guild.name}: +${r.uploaded} yüklendi, ${r.reused} vardı, ` +
              `${r.limited} limit, ${r.failed.length} hata (toplam ${r.total})`,
          );
          if (r.failed.length) {
            console.error(
              `[emoji] ${guild.name} başarısız: ` +
                r.failed.map((f) => `${f.key} (${f.error})`).join(' | '),
            );
          }
        } catch (err) {
          console.error(`[emoji] ${guild.name}:`, err.message);
        }
      }
    }
  },
};
