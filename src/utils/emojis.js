/**
 * Emoji kütüphanesi entegrasyonu.
 *
 * - `<kütüphane>/data/emojis.json` indeksini okur ve config.emojiler.keys
 *   için en uygun kaynağı (yerel dosya) çözer.
 * - `/emojikur` ile emojileri sunucuya `gl_<anahtar>` adıyla yükler ve
 *   `data/emojis.json` içine `<:gl_anahtar:id>` yazdırır.
 * - `E('anahtar', guild)` çağrısı botun her yerinde unicode emoji yerine
 *   sunucunun kendi custom emojilerini kullanır (yoksa tipografik yedeğe düşer).
 */
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const OPT = config.emojiler;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MAP_FILE = path.join(DATA_DIR, 'emojis.json');

/* Unicode emoji YOK - custom emoji yoksa kullanılacak tipografik yedekler */
const FALLBACK = {
  default: '•',
  welcome: '»',
  user: '•',
  member: '•',
  server: '◈',
  security: '◈',
  invite: '»',
  date: '▦',
  time: '◷',
  check: '✓',
  cross: '✕',
  warning: '!',
  info: 'i',
  star: '★',
  heart: '♡',
  badge: '♦',
  rules: '≡',
  arrow: '»',
  dot: '•',
  ticket: '▢',
  claim: '▣',
  voice: '♪',
  delete: '×',
  staff: '♦',
  home: '⌂',
  party: '✳',
  chart: '▤',
  settings: '⚙',
  loading: '◌',
  trophy: '☆',
  crown: '♛',
  boost: '◈',
  money: '§',
  role: '♦',
  channel: '#',
  link: '⌁',
  lock: '■',
  unlock: '□',
  online: '●',
  offline: '○',
  log: '▤',
  refresh: '↻',
  bell: '♪',
  list: '≡',
  id: '#',
  tag: '#',
  bot: '▣',
  kadin: '♦',
  football: '◈',
};

/* ---------- Kayıtlı (kurulu) emojiler ---------- */
let installed = {};

function loadInstalled() {
  try {
    if (fs.existsSync(MAP_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
      installed = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.startsWith('<')) installed[k] = v;
      }
    }
  } catch (err) {
    console.error('[emoji] emojis.json okunamadı:', err.message);
  }
}
loadInstalled();

function saveInstalled() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${MAP_FILE}.tmp`;
    fs.writeFileSync(
      tmp,
      JSON.stringify(
        {
          _comment:
            '/emojikur ile emoji kütüphanesinden kurulan custom emojiler.',
          _docs: 'Değerler <:isim:id> veya <a:isim:id> formatındadır. Unicode emoji kullanılmaz.',
          ...installed,
        },
        null,
        2,
      ),
      'utf8',
    );
    fs.renameSync(tmp, MAP_FILE);
  } catch (err) {
    console.error('[emoji] emojis.json yazılamadı:', err.message);
  }
}

/* ---------- Kütüphane indeksi ---------- */
let libIndex = null; // { byFile: Map, byName: Map }

const norm = (s) => String(s ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function libraryPath() {
  return OPT.libraryPath || '';
}

function loadLibrary() {
  if (libIndex) return libIndex;
  if (!libraryPath()) {
    libIndex = {
      byFile: new Map(),
      byName: new Map(),
      error: 'EMOJI_LIBRARY_PATH ayarlanmamış (.env)',
    };
    console.error('[emoji] Kütüphane yüklenemedi: EMOJI_LIBRARY_PATH ayarlanmamış (.env)');
    return libIndex;
  }
  const file = path.join(libraryPath(), 'data', 'emojis.json');
  try {
    if (!fs.existsSync(file)) throw new Error(`bulunamadı: ${file}`);
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byFile = new Map();
    const byName = new Map();
    for (const entry of list) {
      if (entry.isSticker) continue;
      if (entry.filename) byFile.set(entry.filename.toLowerCase(), entry);
      const n = norm(entry.name);
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(entry);
    }
    libIndex = { byFile, byName };
    console.log(`[emoji] Kütüphane yüklendi: ${list.length} kayıt (${file})`);
  } catch (err) {
    console.error(`[emoji] Kütüphane yüklenemedi: ${err.message}`);
    libIndex = { byFile: new Map(), byName: new Map(), error: err.message };
  }
  return libIndex;
}

function localFile(entry) {
  return path.join(libraryPath(), 'emojis', entry.filename);
}

/** Anahtar için kütüphanedeki kaynağı çözer (dosyası olan ilk aday). */
function resolveSource(key) {
  const idx = loadLibrary();
  const candidates = OPT.keys?.[key] || [key];
  for (const name of candidates) {
    const entries = idx.byName.get(norm(name)) || [];
    for (const entry of entries) {
      if (fs.existsSync(localFile(entry))) return entry;
    }
  }
  return null;
}

function targetName(key) {
  return (OPT.prefix + String(key).toLowerCase())
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 32);
}

function emojiLimit(guild) {
  const tier = guild.premiumTier;
  const n = typeof tier === 'number' ? tier : { NONE: 0, TIER_1: 1, TIER_2: 2, TIER_3: 3 }[tier] || 0;
  return [50, 100, 150, 250][n] || 50;
}

/* ---------- Çözümleyici ---------- */
const parseRe = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/;

function fromGuild(guild, key) {
  if (!guild?.emojis?.cache) return null;
  const name = targetName(key);
  const emoji = guild.emojis.cache.get?.(name) ?? guild.emojis.cache.find((e) => e.name === name);
  if (!emoji) return null;
  return `${emoji.animated ? '<a:' : '<:'}${emoji.name}:${emoji.id}>`;
}

/** Sunucu emojisi (varsa), yoksa kayıtlı harita, yoksa boş dize. */
function raw(key, guild) {
  return (guild && fromGuild(guild, key)) || installed[key] || '';
}

/** Metinlerde kullanılacak emoji (kurulu değilse tipografik yedek). */
function str(key, guild) {
  const value = raw(key, guild);
  if (value) return value;
  return FALLBACK[key] || FALLBACK.default;
}

/** Buton/select için emoji nesnesi; kurulu değilse null. */
function obj(key, guild) {
  const value = raw(key, guild);
  const m = parseRe.exec(value);
  if (!m) return null;
  return { name: m[1], id: m[2], animated: value.startsWith('<a:') };
}

function keys() {
  return Object.keys(OPT.keys || {});
}

function missing(guild) {
  return keys().filter((key) => !raw(key, guild));
}

function status(guild) {
  const all = keys();
  const done = all.filter((key) => raw(key, guild));
  return {
    total: all.length,
    installed: done.length,
    missing: all.length - done.length,
    limit: emojiLimit(guild),
    missingKeys: all.filter((key) => !raw(key, guild)),
  };
}

function remember(key, emoji) {
  installed[key] = `${emoji.animated ? '<a:' : '<:'}${emoji.name}:${emoji.id}>`;
}

/* ---------- Kurulum ---------- */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Eksik emojileri kütüphaneden sunucuya yükler.
 * @returns {{total:number, uploaded:number, reused:number, limited:number, failed:Array}}
 */
async function install(guild, { onProgress } = {}) {
  loadLibrary();
  const all = keys();
  const limit = emojiLimit(guild);
  const result = { total: all.length, uploaded: 0, reused: 0, limited: 0, failed: [], done: 0 };
  const used = new Set(guild.emojis.cache.map((e) => e.id));
  let rateLimited = false;

  for (const key of all) {
    const name = targetName(key);

    // 1) Sunucuda zaten var mı?
    const existing = guild.emojis.cache.find((e) => e.name === name);
    if (existing) {
      remember(key, existing);
      used.add(existing.id);
      result.reused++;
      result.done++;
      if (onProgress) onProgress({ ...result, key, status: 'reused' });
      continue;
    }

    // 2) Limit dolduysa atla
    if (used.size >= limit || rateLimited) {
      result.limited++;
      result.done++;
      if (onProgress) onProgress({ ...result, key, status: rateLimited ? 'ratelimit' : 'limit' });
      continue;
    }

    // 3) Kaynağı bul ve yükle
    try {
      const source = resolveSource(key);
      if (!source) throw new Error('kütüphanede dosya bulunamadı');
      const buffer = fs.readFileSync(localFile(source));
      const created = await Promise.race([
        guild.emojis.create({ name, attachment: buffer, reason: '/emojikur' }),
        delay(60_000).then(() => Promise.reject(new Error('zaman aşımı (429)'))),
      ]);
      remember(key, created);
      used.add(created.id);
      result.uploaded++;
      result.done++;
      if (onProgress) onProgress({ ...result, key, status: 'uploaded' });
      await delay(OPT.delayMs ?? 400);
    } catch (err) {
      result.failed.push({ key, error: err.message });
      result.done++;
      if (/zaman aşımı|429|rate/i.test(err.message)) rateLimited = true;
      if (onProgress) onProgress({ ...result, key, status: 'failed' });
    }
  }

  saveInstalled();
  return result;
}

module.exports = {
  FALLBACK,
  loadInstalled,
  saveInstalled,
  loadLibrary,
  resolveSource,
  targetName,
  emojiLimit,
  raw,
  str,
  obj,
  keys,
  missing,
  status,
  remember,
  install,
};
