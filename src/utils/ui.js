/**
 * Components v2 arayüz oluşturucuları.
 * Not: Components v2 mesajlarında `content` ve `embeds` kullanılamaz;
 * tüm görünüm Container / Section / TextDisplay / Separator ile kurulur.
 * Tüm ikonlar sunucunun `gl_<anahtar>` custom emojileridir (unicode emoji yok);
 * emojiler henüz kurulmamışsa tipografik yedeğe düşer.
 */
const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../../config');
const E = require('./emojis');
const { progressBar, trustReport, serverReport, dateText, ordinal } = require('./analysis');

const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

const text = (content) => new TextDisplayBuilder().setContent(content);
const sep = (large = false) =>
  new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
const thumb = (url) => new ThumbnailBuilder().setURL(url);

/** Emoji kuruluysa butona takar, değilse sadece etiketle bırakır. */
function button(customId, label, style, emojiKey, guild) {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
  const emoji = emojiKey && E.obj(emojiKey, guild);
  if (emoji) b.setEmoji(emoji);
  return b;
}

function linkButton(url, label, emojiKey, guild) {
  const b = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
  const emoji = emojiKey && E.obj(emojiKey, guild);
  if (emoji) b.setEmoji(emoji);
  return b;
}

function linkRow(guild) {
  const rows = [];
  const { rules, invite, site } = config.links || {};
  const btns = [];
  if (rules) btns.push(linkButton(rules, 'Kurallar', 'rules', guild));
  if (site) btns.push(linkButton(site, 'Web Sitesi', 'link', guild));
  if (invite) btns.push(linkButton(invite, 'Davet Et', 'invite', guild));
  if (btns.length) rows.push(new ActionRowBuilder().addComponents(...btns));
  return rows;
}

function galleryRow(url, desc) {
  if (!url) return null;
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(url).setDescription(desc || config.serverName),
  );
}

/* ================= Hoş geldin ================= */
/**
 * @param {import('discord.js').GuildMember} member
 * @param {{inviter?:object|null, panelUrl?:string|null}} ctx
 */
function welcomeMessage(member, ctx = {}) {
  const guild = member.guild;
  const user = member.user;
  const trust = trustReport(user, member);
  const srv = serverReport(guild, config.welcome.milestoneStep);
  const inviter = ctx.inviter || null;

  const container = new ContainerBuilder().setAccentColor(
    config.welcome.showTrust ? trust.color : config.colors.primary,
  );

  const banner = guild.bannerURL?.({ size: 1024, dynamic: true });
  const gallery = galleryRow(banner, `${config.serverName} afişi`);
  if (gallery) container.addMediaGalleryComponents(gallery);

  /* Başlık */
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        text(`# ${E.str('welcome', guild)} ${config.serverName}'ye Hoş Geldin!`),
        text(
          `${member} — **${ordinal(srv.memberCount)}** üyesin. ` +
            `${E.str('star', guild)} Artık burada da bir parçasın!`,
        ),
        text(config.welcomeText),
      )
      .setThumbnailAccessory(thumb(user.displayAvatarURL({ size: 256 }) || DEFAULT_AVATAR)),
  );
  container.addSeparatorComponents(sep(true));

  /* Kullanıcı bilgisi */
  container.addTextDisplayComponents(
    text(
      `### ${E.str('user', guild)} Kullanıcı Bilgisi\n` +
        `> **Kullanıcı:** \`${user.tag}\`  •  **ID:** \`${user.id}\`\n` +
        `> **Hesap açılışı:** ${dateText(user.createdTimestamp)} · ${trust.ageText} ` +
        `(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n` +
        `> **Sunucuya katılım:** ${dateText(member.joinedTimestamp)} ` +
        `(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)\n` +
        `> **Rozetler:** ${trust.flags.length ? trust.flags.join(' • ') : 'Yok'}`,
    ),
  );
  container.addSeparatorComponents(sep());

  /* Güven analizi */
  if (config.welcome.showTrust) {
    container.addTextDisplayComponents(
      text(
        `### ${E.str('security', guild)} Hesap Güven Analizi\n` +
          `${progressBar(trust.score, 100, 14)} **${trust.score}/100** — **${trust.level}**\n` +
          `-# ${E.str('dot', guild)} ${trust.notes
            .map((n) => n.replace(/;$/, ''))
            .join(`  ${E.str('dot', guild)}  `)}`,
      ),
    );
    container.addSeparatorComponents(sep());
  }

  /* Sunucu bilgisi */
  container.addTextDisplayComponents(
    text(
      `### ${E.str('server', guild)} Sunucu Bilgisi\n` +
        `> **Oluşturulma:** ${srv.createdText} · ${srv.ageText} ` +
        `(<t:${Math.floor(srv.createdTimestamp / 1000)}:D>)\n` +
        `> **Üye sayısı:** ${srv.memberCount}  •  **Hedef ${srv.nextMilestone}:** ` +
        `${srv.remaining} kişi kaldı ${progressBar(srv.memberCount, srv.nextMilestone, 8)}\n` +
        `> **Yapı:** ${srv.channels} kanal (${srv.categories} kategori) • ${srv.roles} rol • ` +
        `${srv.emojis} emoji\n` +
        `> **Sunucu seviyesi:** Boost ${srv.boostLevel} (${srv.boosts} boost)`,
    ),
  );
  container.addSeparatorComponents(sep());

  /* Davet bilgisi */
  if (config.welcome.showInviter) {
    const line = inviter
      ? inviter.vanity
        ? `> **Davet eden:** Özel davet bağlantısı\n` +
          `> **Kod:** \`${inviter.code}\` • **Kullanım:** ${inviter.uses}`
        : `> **Davet eden:** <@${inviter.inviterId}> \`${inviter.inviterId || 'Bilinmiyor'}\`\n` +
          `> **Kod:** \`${inviter.code}\` • **Kullanım:** ${inviter.uses}`
      : `> **Davet eden:** ${E.str('info', guild)} Bilinmiyor (davet takibi kapalı olabilir)\n` +
        `> **Not:** Botun Manage Sunucu yetkisi varsa davet eden gösterilir.`;
    container.addTextDisplayComponents(
      text(`### ${E.str('invite', guild)} Davet Bilgisi\n${line}`),
    );
    container.addSeparatorComponents(sep());
  }

  /* Yol haritası + footer */
  container.addTextDisplayComponents(
    config.registerOpen
      ? text(
          `${E.str('ticket', guild)} **Sıradaki adım:** Aşağıdaki ${E.str('arrow', guild)} ` +
            `**Kayıt Paneli** butonundan başvuru formunu doldur, yetkililerin onayıyla ` +
            `kendine özel kanalın açılsın.`,
        )
      : text(
          `${E.str('star', guild)} **Kayıt:** Yetkililer seni isim ve rolünle kaydedecek; ` +
            `ekstra bir şey yapmana gerek yok.`,
        ),
    text(
      `-# ${config.serverName} • Giriş: ${new Date().toLocaleString('tr-TR')} • ` +
        `Sunucu yaşı: ${srv.ageText}`,
    ),
  );

  const rows = [];
  if (ctx.panelUrl && config.registerOpen) {
    rows.push(
      new ActionRowBuilder().addComponents(
        linkButton(ctx.panelUrl, 'Kayıt Paneline Git', 'ticket', guild),
      ),
    );
  }
  rows.push(...linkRow(guild));
  if (rows.length) container.addActionRowComponents(...rows);

  return container;
}

/* ================= Kayıt paneli ================= */
function panelMessage(guild) {
  const open = config.registerOpen;
  const types = Object.entries(config.types);
  const icon = guild.iconURL({ size: 256 }) || guild.client.user.displayAvatarURL({ size: 256 });
  const srv = serverReport(guild, config.welcome.milestoneStep);

  const container = new ContainerBuilder().setAccentColor(
    open ? config.colors.primary : config.colors.warning,
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        text(`# ${E.str('football', guild)} ${config.serverName} — Kayıt Paneli`),
        text(
          open
            ? `> ${E.str('welcome', guild)} Futbolcu, teknik direktör veya üye olarak ` +
                `kariyerine burada başla. Formu doldur, yetkililer seni bekliyor.`
            : `> ${E.str('lock', guild)} **Kayıt sistemi geçici olarak kapalı.** ` +
                `Yetkililer \`${config.prefix}k @kullanici isim <isim>\` ile isim verip ` +
                `panelden rol seçerek kaydediyor.`,
        ),
      )
      .setThumbnailAccessory(thumb(icon)),
  );
  container.addSeparatorComponents(sep(true));

  container.addTextDisplayComponents(
    text(
      `### ${E.str('chart', guild)} Sunucu Durumu\n` +
        `> ${E.str('member', guild)} **Üye** ${srv.memberCount}   ` +
        `${E.str('channel', guild)} **Kanal** ${srv.channels}   ` +
        `${E.str('role', guild)} **Rol** ${srv.roles}   ` +
        `${E.str('party', guild)} **Emoji** ${srv.emojis}\n` +
        `> ${E.str('boost', guild)} **Boost** ${srv.boostLevel} (${srv.boosts})   ` +
        `${E.str('date', guild)} **Kuruluş** ${srv.createdText} • ${srv.ageText}`,
    ),
  );
  container.addSeparatorComponents(sep());

  container.addTextDisplayComponents(
    text(
      `### ${E.str('ticket', guild)} Kayıt Türleri\n` +
        types
          .map(([, t]) => `${E.str(t.emojiKey, guild)} **${t.label}** — ${t.description}`)
          .join('\n'),
    ),
    text(
      open
        ? `-# ${E.str('info', guild)} Seçimini yap → formu doldur → yetkili kanalını açsın. ` +
            `Aynı anda yalnızca bir başvurun açık olabilir.`
        : `-# ${E.str('lock', guild)} Sistem kapalıyken form açılmaz; kayıt ` +
            `\`${config.prefix}k\` ile yapılır.`,
    ),
  );
  container.addSeparatorComponents(sep());

  const mode = config.panelMode;
  if (mode !== 'button') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('kayit_sec')
      .setPlaceholder(open ? 'Kayıt türünü seç ve formu aç...' : 'Kayıt sistemi geçici olarak kapalı')
      .setDisabled(!open)
      .addOptions(
        types.map(([key, t]) => {
          const opt = {
            label: t.label,
            value: key,
            description: t.description.slice(0, 100),
          };
          const emoji = E.obj(t.emojiKey, guild);
          if (emoji) opt.emoji = emoji;
          return opt;
        }),
      );
    container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
  }

  if (mode !== 'select') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        types.map(([key, t]) =>
          button(
            `kayit_ac:${key}`,
            t.label,
            key === 'futbolcu' ? ButtonStyle.Success : ButtonStyle.Primary,
            t.emojiKey,
            guild,
          ).setDisabled(!open),
        ),
      ),
    );
  }

  const links = linkRow(guild);
  for (const row of links) container.addActionRowComponents(row);

  container.addTextDisplayComponents(
    text(
      open
        ? `-# ${config.serverName} • Kayıt sistemi • /emojikur ile emojileri kurabilirsin`
        : `-# ${config.serverName} • Kayıt sistemi geçici olarak kapalı • ` +
            `Açmak için \`config.js → registerOpen: true\``,
    ),
  );
  return container;
}

/* ================= Başvuru formu (Modal) ================= */
function formModal(typeKey, prefill = {}) {
  const type = config.types[typeKey];
  const modal = new ModalBuilder()
    .setCustomId(`kayit_form:${typeKey}`)
    .setTitle(`${type.label} Kaydı`.slice(0, 45));

  for (const f of type.fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label.slice(0, 45))
      .setPlaceholder(f.placeholder)
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(f.max)
      .setRequired(true);
    if (prefill[f.id]) input.setValue(prefill[f.id]);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

/* ================= Kayıt kanalı (açılan kanal) ================= */
function ticketStatus(ticket) {
  if (ticket.resolved === 'approved') {
    return { key: 'check', label: 'Onaylandı', color: config.colors.success };
  }
  if (ticket.resolved === 'rejected') {
    return { key: 'cross', label: 'Reddedildi', color: config.colors.danger };
  }
  if (ticket.claimedBy) {
    return { key: 'claim', label: 'Üstlendi', color: config.colors.info };
  }
  return { key: 'loading', label: 'Yetkili Bekliyor', color: config.colors.warning };
}

function ticketMessage(ticket, avatarUrl, guild) {
  const type = config.types[ticket.type];
  const status = ticketStatus(ticket);
  const claimed = Boolean(ticket.claimedBy);
  const nickPreview = String(type.nick(ticket.data)).slice(0, 32);
  const detailLines = type.fields
    .map((f) => `> ${E.str('dot', guild)} **${f.label}:** \`${ticket.data[f.id] ?? '—'}\``)
    .join('\n');

  const container = new ContainerBuilder().setAccentColor(status.color);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        text(`# ${E.str('ticket', guild)} ${type.label} Başvurusu`),
        text(
          `> **Başvuran:** <@${ticket.userId}> • \`${ticket.userId}\`\n` +
            `> **Talep No:** \`#${ticket.channelId.slice(-6)}\`  •  ` +
            `**Durum:** ${E.str(status.key, guild)} **${status.label}**`,
        ),
      )
      .setThumbnailAccessory(thumb(avatarUrl || DEFAULT_AVATAR)),
  );
  container.addSeparatorComponents(sep(true));

  container.addTextDisplayComponents(
    text(`### ${E.str('list', guild)} Başvuru Detayları\n${detailLines}`),
    text(
      `> ${E.str('user', guild)} **Verilecek takma ad:** \`${nickPreview}\`\n` +
        `> ${E.str('date', guild)} **Açılış:** <t:${Math.floor(ticket.createdAt / 1000)}:R> • ` +
        `${E.str('channel', guild)} **Kanal:** <#${ticket.channelId}>` +
        (ticket.voiceChannelId
          ? `\n> ${E.str('voice', guild)} **Ses teyidi:** <#${ticket.voiceChannelId}>`
          : ''),
    ),
  );
  container.addSeparatorComponents(sep());

  container.addTextDisplayComponents(
    text(
      `### ${E.str('settings', guild)} İşlem Adımları\n` +
        `1. ${E.str('dot', guild)} Form bilgileri yetkili tarafından kontrol edilir\n` +
        `2. ${E.str('dot', guild)} ${E.str('check', guild)} Onaylanır veya ` +
        `${E.str('cross', guild)} reddedildiğinde sebebi DM ile iletilir\n` +
        `3. ${E.str('dot', guild)} Rol ve takma ad verilir, kanal otomatik kapatılır`,
    ),
  );
  container.addSeparatorComponents(sep());

  container.addTextDisplayComponents(
    text(
      claimed
        ? `${E.str('claim', guild)} Bu kayıt **<@${ticket.claimedBy}>** yetkilisi tarafından ` +
            `üstlenildi; ilgilenen tek kişi odur.`
        : `${E.str('loading', guild)} Yetkili bekleniyor — lütfen sabırlı ol, ` +
            `${E.str('bell', guild)} **Yetkili Çağır** ile hatırlatma gönderebilirsin.`,
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      button('kayit_onay', 'Onayla', ButtonStyle.Success, 'check', guild),
      button('kayit_red', 'Reddet', ButtonStyle.Danger, 'cross', guild),
      button('kayit_isim', 'İsim Değiş', ButtonStyle.Secondary, 'settings', guild),
      button('kayit_ustlen', 'Üstlen', ButtonStyle.Primary, 'claim', guild).setDisabled(claimed),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      button('kayit_cagir', 'Yetkili Çağır', ButtonStyle.Secondary, 'bell', guild),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('kayit_hizli')
        .setPlaceholder('Hızlı işlem menüsü (yetkili)...')
        .addOptions(
          [
            { label: 'Onayla', value: 'kayit_onay', description: 'Rolü ver, kanalı kapat', key: 'check' },
            { label: 'Reddet', value: 'kayit_red', description: 'Sebep modalını aç', key: 'cross' },
            { label: 'İsim Değiştir', value: 'kayit_isim', description: 'Hızlı isim modalı', key: 'settings' },
            { label: 'Üstlen', value: 'kayit_ustlen', description: 'Kaydı üzerine al', key: 'claim' },
          ].map((o) => {
            const opt = { label: o.label, value: o.value, description: o.description };
            const emoji = E.obj(o.key, guild);
            if (emoji) opt.emoji = emoji;
            return opt;
          }),
        ),
    ),
  );
  container.addTextDisplayComponents(
    text(
      `-# ${config.serverName} • Bu kanal yalnızca sana ve kayıt yetkililerine açıktır. ` +
        `İşlem bittikten sonra otomatik silinir.`,
    ),
  );
  return container;
}

/* ================= .k — Hızlı kayıt paneli ================= */
/**
 * Yetkilinin `.k @kullanici [isim]` ile açtığı panel:
 * 1) isim komutun kendisinde uygulanır (takma ad),
 * 2) paneldeki menüden rol seçilir -> rol anında verilir + loglanır.
 * Kayıt paneli (başvuru kanalı) sisteminden bağımsızdır.
 *
 * @param {{guild:object, user:object, name?:string, nameNote?:string,
 *          settings:object, givenRole?:object, ticket?:object}} ctx
 */
function kayitPanel(ctx = {}) {
  const { guild, user, name, nameNote, settings, givenRole, ticket } = ctx;
  const roleMap = settings?.roles || {};
  const hasRoles = Object.values(roleMap).some(Boolean);
  const appliedName = name || user?.nickname || user?.displayName || null;

  const container = new ContainerBuilder().setAccentColor(
    givenRole ? config.colors.success : config.colors.info,
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        text(`# ${E.str('staff', guild)} Hızlı Kayıt — <@${user.id}>`),
        text(
          `> **Hedef:** <@${user.id}> • \`${user.id}\`\n` +
            `> **Uygulanan isim:** \`${appliedName || 'verilmedi'}\`` +
            (nameNote ? `  •  ${nameNote}` : '') +
            `\n` +
            `> **Verilen rol:** ` +
            (givenRole
              ? `${E.str('check', guild)} <@&${givenRole.roleId}> (${givenRole.label})`
              : `${E.str('loading', guild)} henüz seçilmedi`),
        ),
      )
      .setThumbnailAccessory(thumb(user?.displayAvatarURL?.({ size: 256 }) || DEFAULT_AVATAR)),
  );
  container.addSeparatorComponents(sep(true));

  if (givenRole) {
    container.addTextDisplayComponents(
      text(
        `### ${E.str('check', guild)} Kayıt tamamlandı\n` +
          `> ${E.str('user', guild)} **<@${user.id}>** artık **${givenRole.label}**. ` +
          `Takma adı: \`${appliedName || '—'}\`\n` +
          `> ${E.str('log', guild)} Log kanalına yazıldı; menüden başka rol de seçebilirsin.`,
      ),
    );
  } else {
    container.addTextDisplayComponents(
      text(
        `### ${E.str('list', guild)} Sonraki adım: rol seç\n` +
          `> ${E.str('dot', guild)} İsim zaten takma ad olarak uygulandı.\n` +
          `> ${E.str('dot', guild)} Aşağıdaki menüden rolü seç → rol anında verilir ve loglanır.`,
      ),
    );
  }
  container.addSeparatorComponents(sep());

  if (hasRoles) {
    const options = Object.entries(roleMap)
      .filter(([, roleId]) => roleId)
      .map(([key, roleId]) => {
        const type = Object.values(config.types).find((t) => t.roleKey === key);
        const roleName = guild.roles.cache.get(roleId)?.name ?? key;
        const opt = {
          label: type?.label ?? key,
          value: key,
          description: `Rol: ${roleName}`,
        };
        if (givenRole?.roleId === roleId) opt.default = true;
        const emoji = E.obj(type?.emojiKey ?? 'role', guild);
        if (emoji) opt.emoji = emoji;
        return opt;
      });

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`kayit_rol:${user.id}`)
          .setPlaceholder(givenRole ? 'Rolü değiştir...' : 'Rol seç...')
          .addOptions(options),
      ),
    );
  } else {
    container.addTextDisplayComponents(
      text(
        `> ${E.str('warning', guild)} Rol ayarları yok: \`/kayit-kur\` ile rolleri tanımla ` +
          `(uye, kadin, futbolcu, teknik).`,
      ),
    );
  }

  if (ticket?.channelId && guild.channels.cache.has(ticket.channelId)) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        button(
          `kayit_kapat:${ticket.channelId}`,
          'Başvuru Kanalını Kapat',
          ButtonStyle.Danger,
          'delete',
          guild,
        ),
        linkButton(
          `https://discord.com/channels/${guild.id}/${ticket.channelId}`,
          'Başvuru Kanalı',
          'channel',
          guild,
        ),
      ),
    );
  }

  container.addTextDisplayComponents(
    text(
      `-# ${config.serverName} • .k ile açıldı • ${dateText(Date.now())} • ` +
        `Komut: \`${config.prefix}k @kullanici isim <isim>\``,
    ),
  );
  return container;
}

/* ================= Log ================= */
function logMessage(title, lines, color = config.colors.info) {
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(
    text(`## ${title}`),
    text(lines.join('\n')),
    text(`-# ${config.serverName} • Kayıt logu • ${new Date().toLocaleString('tr-TR')}`),
  );
  return container;
}

/* ================= İstatistik ================= */
const STAT_LABELS = [
  ['uye', 'Üye'],
  ['kadin', 'Kadın Üye'],
  ['futbolcu', 'Futbolcu'],
  ['td', 'Teknik Direktör'],
];

function bar(value, max, len = 12) {
  const filled = max > 0 ? Math.round((value / max) * len) : 0;
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function statBlock(counts) {
  const max = Math.max(1, ...STAT_LABELS.map(([k]) => counts[k] ?? 0));
  const rows = STAT_LABELS.map(
    ([k, label]) => `${label.padEnd(15)} ${bar(counts[k] ?? 0, max)} ${counts[k] ?? 0}`,
  );
  return '```\n' + rows.join('\n') + '\n```';
}

const sum = (counts) => STAT_LABELS.reduce((a, [k]) => a + (counts[k] ?? 0), 0);

function statsMessage(user, stat, weeklyRank, guild) {
  const container = new ContainerBuilder().setAccentColor(config.colors.success);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        text(`# ${E.str('chart', guild)} Kayıt İstatistikleri`),
        text(
          `> **Yetkili:** <@${user.id}>\n` +
            `> **Toplam kayıt:** ${sum(stat.total)} • **Bu hafta:** ${sum(stat.weekly)}` +
            (weeklyRank ? ` • **Haftalık sıra:** #${weeklyRank}` : ''),
        ),
      )
      .setThumbnailAccessory(thumb(user.displayAvatarURL({ size: 256 }) || DEFAULT_AVATAR)),
  );
  container.addSeparatorComponents(sep(true));
  container.addTextDisplayComponents(
    text(`### ${E.str('star', guild)} Haftalık (${sum(stat.weekly)})\n${statBlock(stat.weekly)}`),
  );
  container.addSeparatorComponents(sep());
  container.addTextDisplayComponents(
    text(`### ${E.str('trophy', guild)} Toplam (${sum(stat.total)})\n${statBlock(stat.total)}`),
  );
  container.addSeparatorComponents(sep());
  container.addTextDisplayComponents(
    text(`-# ${config.serverName} • Haftalık sayaç her hafta sıfırlanır • ${dateText(Date.now())}`),
  );
  return container;
}

/* ================= Emoji kurulum paneli ================= */
function installPanel(state) {
  const {
    phase = 'loading', // loading | done | error
    title,
    lines = [],
    color = config.colors.info,
    thumbUrl = DEFAULT_AVATAR,
  } = state;

  const container = new ContainerBuilder().setAccentColor(color);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(text(`## ${title}`), text(lines.join('\n') || ' '))
      .setThumbnailAccessory(thumb(thumbUrl)),
  );
  container.addSeparatorComponents(sep());
  if (phase === 'loading') {
    container.addTextDisplayComponents(
      text(`-# Lütfen bekleyin • Bu işlem birkaç dakika sürebilir.`),
    );
  } else {
    container.addTextDisplayComponents(
      text(`-# ${config.serverName} • Emoji kurulumu tamamlandı.`),
    );
  }
  return container;
}

module.exports = {
  text,
  sep,
  thumb,
  button,
  linkButton,
  welcomeMessage,
  panelMessage,
  formModal,
  ticketMessage,
  ticketStatus,
  kayitPanel,
  logMessage,
  statsMessage,
  installPanel,
};
