/**
 * Hoş geldin mesajı için hesap güven analizi, sunucu bilgileri ve
 * biçimlendirme yardımcıları.
 */
const { UserFlagsBitField } = require('discord.js');

const FLAG_LABELS = {
  Staff: 'Discord Ekibi',
  Partner: 'Discord Partneri',
  HypesquadHouse1: 'HypeSquad - Bravery',
  HypesquadHouse2: 'HypeSquad - Brilliance',
  HypesquadHouse3: 'HypeSquad - Balance',
  HypesquadOnlineHouse1: 'HypeSquad - Bravery',
  HypesquadOnlineHouse2: 'HypeSquad - Brilliance',
  HypesquadOnlineHouse3: 'HypeSquad - Balance',
  PremiumEarlySupporter: 'Erken Nitro Destekçisi',
  PremiumPartner: 'Nitro Partneri',
  VerifiedDeveloper: 'Doğrulanan Bot Geliştiricisi',
  ActiveDeveloper: 'Aktif Geliştirici',
  CertifiedModerator: 'Sertifikalı Moderatör',
  BugHunterLevel1: 'Hata Avcısı',
  BugHunterLevel2: 'Kıdemli Hata Avcısı',
  BotHTTPInteractions: 'HTTP Etkileşim Botu',
  Quarantined: 'Karantina',
  DisabledModeration: 'Moderasyon Kapalı',
};

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function dateText(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** İnsani süre: "1 yıl 2 ay", "45 gün", "8 saat" */
function ageText(ms) {
  const min = 60_000, hour = min * 60, day = hour * 24;
  const month = day * 30, year = day * 365;
  if (ms < hour) return `${Math.max(1, Math.floor(ms / min))} dakika`;
  if (ms < day) return `${Math.floor(ms / hour)} saat`;
  if (ms < month) return `${Math.floor(ms / day)} gün`;
  if (ms < year) {
    const m = Math.floor(ms / month);
    const d = Math.floor((ms % month) / day);
    return d > 0 && m < 12 ? `${m} ay ${d} gün` : `${m} ay`;
  }
  const y = Math.floor(ms / year);
  const m = Math.floor((ms % year) / month);
  return m > 0 ? `${y} yıl ${m} ay` : `${y} yıl`;
}

function progressBar(value, max, len = 14) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const filled = Math.round(ratio * len);
  return `\`[${'█'.repeat(filled)}${'░'.repeat(len - filled)}]\``;
}

function userFlags(user) {
  try {
    const bit = new UserFlagsBitField(user.publicFlags ?? 0);
    return bit.toArray().map((f) => FLAG_LABELS[f]).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Hesap güven skoru (0-100) ve seviyesi.
 * Yeni hesap, avatarı olmayan, varsayılan kullanıcı adlı ve rozetsiz
 * hesaplar düşük puan alır.
 */
function trustReport(user, member) {
  const now = Date.now();
  const ageMs = now - user.createdTimestamp;
  const ageDays = ageMs / 86_400_000;
  const notes = [];
  let score = 0;

  if (ageDays >= 365) { score += 40; notes.push(`Eski hesap (${ageText(ageMs)});`); }
  else if (ageDays >= 180) { score += 34; notes.push(`Olgun hesap (${ageText(ageMs)});`); }
  else if (ageDays >= 90) { score += 28; notes.push(`${ageText(ageMs)}lık hesap;`); }
  else if (ageDays >= 30) { score += 20; notes.push(`1 aydan yeni (${ageText(ageMs)});`); }
  else if (ageDays >= 7) { score += 10; notes.push(`Son 1 haftada açılmış (${ageText(ageMs)});`); }
  else { score += 0; notes.push(`ÇOK YENİ hesap (${ageText(ageMs)});`); }

  if (user.avatar) { score += 15; notes.push('Profil fotoğrafı var;'); }
  else notes.push('Profil fotoğrafı YOK;');

  if (!/^discord_user_\d+$/.test(user.username)) { score += 10; notes.push('Özgün kullanıcı adı;'); }
  else notes.push('Varsayılan kullanıcı adı;');

  const flags = userFlags(user);
  if (flags.length) { score += Math.min(25, flags.length * 15); notes.push(`Rozet: ${flags.join(', ')};`); }

  const joinedAt = member?.joinedTimestamp ?? now;
  const bornToJoin = joinedAt - user.createdTimestamp;
  if (ageDays >= 30 && bornToJoin < 86_400_000 * 3) { score += 10; notes.push('Hesap açıldıktan kısa süre sonra katıldı;'); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level, color;
  if (score >= 85) { level = 'Çok Güvenilir'; color = 0x2ecc71; }
  else if (score >= 65) { level = 'Güvenilir'; color = 0x3498db; }
  else if (score >= 40) { level = 'Şüpheli'; color = 0xf1c40f; }
  else { level = 'Riskli'; color = 0xe74c3c; }

  return {
    score,
    level,
    color,
    notes,
    ageText: ageText(ageMs),
    createdTimestamp: user.createdTimestamp,
    flags,
    hasAvatar: Boolean(user.avatar),
  };
}

/** Sunucu bilgileri: oluşturma tarihi, üye sayısı, hedef milestone */
function serverReport(guild, step = 100) {
  const count = guild.memberCount;
  const next = Math.ceil((count + 1) / step) * step;
  return {
    createdTimestamp: guild.createdTimestamp,
    createdText: dateText(guild.createdTimestamp),
    ageText: ageText(Date.now() - guild.createdTimestamp),
    memberCount: count,
    nextMilestone: next,
    remaining: next - count,
    channels: guild.channels.cache.size,
    categories: guild.channels.cache.filter((c) => c.type === 4).size,
    textChannels: guild.channels.cache.filter((c) => c.isTextBased?.() && c.type !== 4).size,
    voiceChannels: guild.channels.cache.filter((c) => c.type === 2).size,
    roles: guild.roles.cache.size,
    emojis: guild.emojis.cache.size,
    boostLevel: guild.premiumTier ?? 0,
    boosts: guild.premiumSubscriptionCount ?? 0,
  };
}

function ordinal(n) {
  return `${n}.`;
}

module.exports = {
  dateText,
  ageText,
  progressBar,
  userFlags,
  trustReport,
  serverReport,
  ordinal,
};
