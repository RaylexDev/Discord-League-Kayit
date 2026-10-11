const { PermissionFlagsBits } = require('discord.js');

/* ---------- Metin temizleme ---------- */
// Mention, markdown ve kontrol karakterlerini temizler
function sanitize(text, max = 64) {
  return String(text ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[`*_~|<>@#\\\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Türkçe karakterleri sadeleştirip kanal adı için uygun hale getirir
function slugify(name, fallback = 'kullanici') {
  const s = String(name ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return s || String(fallback).slice(0, 20);
}

/* ---------- Yetki ---------- */
function isAdmin(member) {
  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator));
}

function isStaff(member, settings) {
  if (!member) return false;
  if (isAdmin(member)) return true;
  return Boolean(settings?.staffRoleId && member.roles?.cache?.has(settings.staffRoleId));
}

/* ---------- Cooldown ---------- */
const cooldowns = new Map();

function cooldownLeft(key) {
  const exp = cooldowns.get(key);
  if (!exp) return 0;
  const left = exp - Date.now();
  if (left <= 0) {
    cooldowns.delete(key);
    return 0;
  }
  return left;
}

function setCooldown(key, ms) {
  cooldowns.set(key, Date.now() + ms);
}

/* ---------- Kilit (çift tıklama koruması) ---------- */
const locks = new Set();
const tryLock = (key) => (locks.has(key) ? false : (locks.add(key), true));
const unlock = (key) => locks.delete(key);

/* ---------- Tarih ---------- */
// ISO hafta anahtarı (örn. 2026-W41)
function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

module.exports = {
  sanitize,
  slugify,
  isAdmin,
  isStaff,
  cooldownLeft,
  setCooldown,
  tryLock,
  unlock,
  getWeekKey,
};
