const { ChannelType } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const config = require('../../config');
const db = require('../utils/db');
const ui = require('../utils/ui');
const E = require('../utils/emojis');
const { isStaff, sanitize } = require('../utils/helpers');
const { V2 } = require('../utils/ticket');

const sum = (c) => Object.values(c).reduce((a, b) => a + b, 0);

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.inGuild()) return;

    const content = message.content.trim().toLowerCase();
    const kstat = `${config.prefix}kstat`;
    const emojikur = `${config.prefix}emojikur`;

    if (content === emojikur || content.startsWith(`${emojikur} `)) {
      await runEmojiInstall(message);
      return;
    }
    const ses = `${config.prefix}ses`;
    if (content === ses || content.startsWith(`${ses} `)) {
      await runSes(message);
      return;
    }
    const kcmd = `${config.prefix}k`;
    if (content === kcmd || content.startsWith(`${kcmd} `)) {
      await runKPanel(message);
      return;
    }
    if (content !== kstat && !content.startsWith(`${kstat} `)) return;

    try {
      const settings = db.getGuild(message.guild.id);
      if (!isStaff(message.member, settings)) {
        await message.reply({
          content: `${E.str('security', message.guild)} Bu komutu sadece Kayıt Yetkilileri kullanabilir!`,
          allowedMentions: { parse: [], repliedUser: false },
        });
        return;
      }

      const target = message.mentions.users.first() ?? message.author;
      const stat = db.getStat(message.guild.id, target.id);
      const ranked = db
        .getAllStats(message.guild.id)
        .filter((s) => sum(s.weekly) > 0)
        .sort((a, b) => sum(b.weekly) - sum(a.weekly));
      const idx = ranked.findIndex((s) => s.id === target.id);

      await message.reply({
        components: [ui.statsMessage(target, stat, idx >= 0 ? idx + 1 : null, message.guild)],
        flags: V2,
        allowedMentions: { parse: [], repliedUser: false },
      });
    } catch (err) {
      console.error('[messageCreate] .kstat hatası:', err);
    }
  },
};

/** `.emojikur` — ilerleme paneliyle sunucuya custom emoji kurar. */
async function runEmojiInstall(message) {
  try {
    const me = message.member;
    if (!me.permissions.has('ManageGuildExpressions') && !me.permissions.has('Administrator')) {
      await message.reply({
        content: `${E.str('security', message.guild)} Bu komutu sadece emoji/manage sunucu yetkisi olanlar kullanabilir.`,
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    const guild = message.guild;
    const before = E.status(guild);
    let panel = await message.channel.send({
      components: [
        ui.installPanel({
          title: `${E.str('settings', guild)} Emoji kurulumu başlatılıyor`,
          lines: [
            `> **Kütüphane:** yerel emoji kütüphanesi`,
            `> **Eksik:** ${before.missing} / ${before.total}  •  **Emoji limiti:** ${before.limit}`,
            `> **Önek:** \`${config.emojiler.prefix}<anahtar>\``,
          ],
          phase: 'loading',
          color: config.colors.info,
          thumbUrl: guild.iconURL({ size: 256 }) || undefined,
        }),
      ],
      flags: V2,
      allowedMentions: { parse: [] },
    });

    let last = 0;
    const result = await E.install(guild, {
      onProgress: async (p) => {
        if (Date.now() - last < 3000) return;
        last = Date.now();
        await panel
          .edit({
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
                thumbUrl: guild.iconURL({ size: 256 }) || undefined,
              }),
            ],
            flags: V2,
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
        `-# ${E.str('info', guild)} Eksikler sunucu limitine takıldı; limit büyüyünce tekrar çalıştır. ` +
          `Kurulmayan ikonlar tipografik yedekle gösterilir.`,
      );
    }

    await panel.edit({
      components: [
        ui.installPanel({
          title: `${E.str('check', guild)} Emoji kurulumu tamamlandı`,
          lines,
          phase: 'done',
          color: result.failed.length ? config.colors.warning : config.colors.success,
          thumbUrl: guild.iconURL({ size: 256 }) || undefined,
        }),
      ],
      flags: V2,
    });
  } catch (err) {
    console.error('[emojikur] kurulum hatası:', err);
    await message
      .reply({
        content: `${E.str('cross', message.guild)} Emoji kurulumu başarısız: ${err.message}`,
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
  }
}

/**
 * `.k <@kullanici> [isim]` — bağımsız hızlı kayıt sistemi
 * (kayıt paneli sisteminden ayrı çalışır):
 * 1) isim verilmişse doğrudan takma ad olarak uygulanır,
 * 2) açılan panelden rol seçilir → rol verilir, loglanır, sayaç işlenir.
 */
async function runKPanel(message) {
  try {
    const guild = message.guild;
    const settings = db.getGuild(guild.id);
    if (!isStaff(message.member, settings)) {
      await message.reply({
        content: `${E.str('security', guild)} Bu komutu sadece Kayıt Yetkilileri kullanabilir!`,
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    const usage =
      `${E.str('info', guild)} Kullanım: \`${config.prefix}k @kullanici [isim <isim>]\`\n` +
      `> ${E.str('dot', guild)} İsim verilirse **takma ad olarak uygulanır**.\n` +
      `> ${E.str('dot', guild)} Açılan panelden **rol seçilir** (rol + log + istatistik).\n` +
      `Örn: \`${config.prefix}k @Ahmet isim Ahmet Yılmaz\`  •  \`${config.prefix}k @Ahmet\``;

    const args = message.content
      .trim()
      .slice(config.prefix.length + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!args.length) {
      await message.reply({ content: usage, allowedMentions: { parse: [], repliedUser: false } });
      return;
    }

    let target = message.mentions.users.first() ?? null;
    if (!target && /^\d{17,20}$/.test(args[0])) {
      target = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) {
      await message.reply({ content: usage, allowedMentions: { parse: [], repliedUser: false } });
      return;
    }

    // `.k @user isim Ahmet Yılmaz` veya `.k @user Ahmet Yılmaz`
    let name = args.slice(1).join(' ').trim();
    if (name) {
      const parts = name.split(/\s+/);
      if (parts[0].toLowerCase() === 'isim') parts.shift();
      name = sanitize(parts.join(' ').trim(), 32);
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    let nameNote = null;
    if (name) {
      if (!member) {
        nameNote = `${E.str('warning', guild)} Kullanıcı sunucuda değil, isim uygulanamadı.`;
      } else {
        try {
          await member.setNickname(name, `.k isim: ${message.author.tag}`);
        } catch {
          nameNote = `${E.str('warning', guild)} Takma ad uygulanamadı (bot rolü yukarıda olmalı).`;
        }
      }
    }

    const ticket = db.findOpenTicketByUser(guild.id, target.id);

    await message.reply({
      components: [
        ui.kayitPanel({
          guild,
          user: member ?? target,
          name: name || member?.nickname || null,
          nameNote,
          settings,
          ticket: ticket || undefined,
        }),
      ],
      flags: V2,
      allowedMentions: { parse: [], repliedUser: false },
    });
  } catch (err) {
    console.error('[messageCreate] .k hatası:', err);
  }
}

/**
 * `.ses [#ses-kanali]` — botu ses kanalına sokar; kanal söylenmezse çıkarır.
 */
async function runSes(message) {
  try {
    const guild = message.guild;
    const me = message.member;
    const settings = db.getGuild(guild.id);
    if (!me.permissions.has('MoveMembers') && !me.permissions.has('Administrator') && !isStaff(me, settings)) {
      await message.reply({
        content: `${E.str('security', guild)} Bu komutu sadece yetkililer kullanabilir!`,
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    const channel = message.mentions.channels.first();

    if (!channel) {
      const conn = getVoiceConnection(guild.id);
      if (!conn) {
        await message.reply({
          content: `${E.str('info', guild)} Bot zaten seste değil. Bağlanmak için: \`${config.prefix}ses #ses-kanalı\``,
          allowedMentions: { parse: [], repliedUser: false },
        });
        return;
      }
      conn.destroy();
      await message.reply({
        content: `${E.str('check', guild)} Bot ses kanalından çıkarıldı.`,
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    if (channel.type !== ChannelType.GuildVoice) {
      await message.reply({
        content: `${E.str('cross', guild)} Sadece **ses kanalı** olabilir.`,
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    await message.reply({
      content: `${E.str('voice', guild)} Bot **${channel.name}** ses kanalına bağlandı.`,
      allowedMentions: { parse: [], repliedUser: false },
    });
  } catch (err) {
    console.error('[messageCreate] .ses hatası:', err);
  }
}
