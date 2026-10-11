/**
 * Davet takibi: hoş geldin mesajında "kim davet etti" bilgisini göstermek
 * için bot açıldığında tüm davetlerin kullanım sayılarını anlık olarak tutar.
 * Manage Guild yetkisi yoksa veya davetler okunamazsa sessizce devre dışı kalır.
 */

/** guildId -> Map<code, { uses, inviterId, vanity? }> */
const snapshots = new Map();
const unavailable = new Set();

function toMap(invites) {
  const map = new Map();
  for (const inv of invites.values()) {
    map.set(inv.code, {
      uses: inv.uses ?? 0,
      inviterId: inv.inviter?.id ?? null,
    });
  }
  return map;
}

async function snapshot(guild) {
  try {
    const invites = await guild.invites.fetch();
    snapshots.set(guild.id, toMap(invites));
    unavailable.delete(guild.id);
    return true;
  } catch (err) {
    unavailable.add(guild.id);
    snapshots.set(guild.id, new Map());
    console.warn(`[invite] ${guild.id} davetleri okunamadı: ${err.message}`);
    return false;
  }
}

async function snapshotAll(client) {
  for (const guild of client.guilds.cache.values()) {
    await snapshot(guild);
  }
}

function track(guild, code, data) {
  const map = snapshots.get(guild.id) ?? new Map();
  map.set(code, data);
  snapshots.set(guild.id, map);
}

function untrack(guild, code) {
  snapshots.get(guild.id)?.delete(code);
}

/**
 * Yeni katılan üye için davet edeni bulur.
 * @returns {Promise<{code:string, uses:number, inviterId:string|null, vanity:boolean}|null>}
 */
async function resolveInviter(guild) {
  if (unavailable.has(guild.id)) return null;
  const before = snapshots.get(guild.id);
  if (!before) return null;

  let invites;
  try {
    const data = await guild.invites.fetch();
    invites = data;
  } catch {
    return null;
  }

  let best = null;
  let bestDelta = 0;
  for (const inv of invites.values()) {
    const prev = before.get(inv.code);
    const uses = inv.uses ?? 0;
    const delta = uses - (prev?.uses ?? 0);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = {
        code: inv.code,
        uses,
        inviterId: inv.inviter?.id ?? prev?.inviterId ?? null,
        vanity: false,
      };
    }
  }

  // Sunucu gizli bağlantısı (vanity) değişti mi?
  try {
    const vanity = await guild.fetchVanityData();
    if (vanity?.code) {
      const key = `vanity:${guild.id}`;
      const prev = before.get(key);
      if (prev && (vanity.uses ?? 0) > prev.uses && !best) {
        best = { code: vanity.code, uses: vanity.uses, inviterId: null, vanity: true };
      }
      snapshots.get(guild.id).set(key, { uses: vanity.uses ?? 0, inviterId: null, vanity: true });
    }
  } catch {
    // vanity yetkisi/verisi yoksa yoksay
  }

  // Anlık görüntüyü tazele
  const next = toMap(invites);
  const key = `vanity:${guild.id}`;
  if (before.has(key)) next.set(key, before.get(key));
  snapshots.set(guild.id, next);

  return best;
}

module.exports = { snapshot, snapshotAll, track, untrack, resolveInviter };
