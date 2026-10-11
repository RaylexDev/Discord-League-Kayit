const fs = require('fs');
const path = require('path');
const { getWeekKey } = require('./helpers');

const DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DIR, 'db.json');

const STAT_KEYS = ['uye', 'kadin', 'futbolcu', 'td'];
let data = { guilds: {}, tickets: {}, stats: {} };
let timer = null;

const zeros = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
const emptyStat = () => ({ total: zeros(), weekly: { key: getWeekKey(), ...zeros() } });

function init() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      data = { guilds: {}, tickets: {}, stats: {}, ...parsed };
    }
  } catch (err) {
    console.error('[db] Veritabanı okunamadı, yeni oluşturuluyor:', err);
    try {
      fs.copyFileSync(FILE, `${FILE}.bozuk-${Date.now()}`);
    } catch {}
  }
}

function flush() {
  clearTimeout(timer);
  timer = null;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.error('[db] Yazma hatası:', err);
  }
}

function save() {
  if (timer) return;
  timer = setTimeout(flush, 250);
}

/* ---------- Sunucu ayarları ---------- */
function getGuild(id) {
  return data.guilds[id] ?? { roles: {} };
}

function setGuild(id, patch) {
  const cur = getGuild(id);
  data.guilds[id] = { ...cur, ...patch, roles: { ...cur.roles, ...(patch.roles || {}) } };
  save();
  return data.guilds[id];
}

/* ---------- Kayıt kanalları (ticket) ---------- */
function getTicket(channelId) {
  return data.tickets[channelId] ?? null;
}

function findOpenTicketByUser(guildId, userId) {
  return (
    Object.values(data.tickets).find((t) => t.guildId === guildId && t.userId === userId) ?? null
  );
}

function createTicket(ticket) {
  data.tickets[ticket.channelId] = ticket;
  save();
  return ticket;
}

function updateTicket(channelId, patch) {
  const t = data.tickets[channelId];
  if (!t) return null;
  Object.assign(t, patch);
  save();
  return t;
}

function deleteTicket(channelId) {
  if (data.tickets[channelId]) {
    delete data.tickets[channelId];
    save();
  }
}

/* ---------- İstatistikler ---------- */
function addStat(guildId, staffId, type) {
  if (!STAT_KEYS.includes(type)) return;
  const g = (data.stats[guildId] ||= {});
  const s = (g[staffId] ||= emptyStat());
  const wk = getWeekKey();
  if (s.weekly.key !== wk) s.weekly = { key: wk, ...zeros() };
  s.total[type] += 1;
  s.weekly[type] += 1;
  save();
}

function getStat(guildId, staffId) {
  const s = data.stats[guildId]?.[staffId];
  const wk = getWeekKey();
  if (!s) return { total: zeros(), weekly: zeros() };
  const weekly = s.weekly.key === wk ? s.weekly : zeros();
  return {
    total: { ...zeros(), ...s.total },
    weekly: Object.fromEntries(STAT_KEYS.map((k) => [k, weekly[k] ?? 0])),
  };
}

function getAllStats(guildId) {
  return Object.keys(data.stats[guildId] ?? {}).map((id) => ({ id, ...getStat(guildId, id) }));
}

module.exports = {
  STAT_KEYS,
  init,
  flush,
  getGuild,
  setGuild,
  getTicket,
  findOpenTicketByUser,
  createTicket,
  updateTicket,
  deleteTicket,
  addStat,
  getStat,
  getAllStats,
};
