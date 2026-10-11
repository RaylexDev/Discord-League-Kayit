/**
 * Genel Ayarlar
 * Kayıt türleri, modal alanları, takma ad şablonları, renkler ve
 * emoji kütüphanesi ayarları burada tanımlıdır.
 */

const path = require('path');

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'\-\/]*$/u;
const TEXT_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'\-&\/]*$/u;
const POS_RE = /^[\p{L}\p{N}\-]{1,12}$/u;

/**
 * Emoji anahtarları -> Emoji kütüphanesinde aranacak isim adayları.
 * Sıra önemlidir: listede öncelikli anahtarlar sunucu emoji limitine
 * takılırsa ilk sıradakiler kurulur. Kurulumda her anahtar için dosya
 * yerel `emojis/` klasöründe aranır ve `gl_<anahtar>` adıyla yüklenir.
 */
const EMOJI_KEYS = {
  welcome: ['hosgeldin', 'hogeldin', 'welcome', 'join_'],
  user: ['user', 'kullanici'],
  member: ['icons_people', 'member', 'members', 'uye'],
  server: ['server', 'sunucu', 'guild'],
  security: ['security', 'mudahale'],
  invite: ['invite', 'Invite'],
  date: ['date', 'icons_calender', 'tarih'],
  time: ['time', 'zaman'],
  check: ['onay', 'tik', 'success'],
  cross: ['red', 'carpi'],
  warning: ['uyari', 'warning', 'raylexdev_warning'],
  info: ['info', 'bilgi'],
  star: ['yildiz', '9222star'],
  heart: ['kalp', 'rengarenkkalp', 'white_heart'],
  badge: ['rozet', 'rolebadge'],
  rules: ['rules', 'kurallar'],
  arrow: ['arrow', 'atOku', 'seta_gen'],
  dot: ['nokta'],
  ticket: ['ticket', 'bilet'],
  claim: ['claim', 'kurtaris'],
  voice: ['voice', 'emote_voice', 'sesKanal'],
  delete: ['delete', 'sil', 'clear'],
  staff: ['staff', 'yetkili', 'moderator'],
  home: ['home', 'stadyum'],
  party: ['tada', 'konfeti', 'confetti'],
  chart: ['stats', 'istatistik', 'ranking'],
  settings: ['settings', 'ayar', 'gear'],
  loading: ['loading', 'yukleniyor', 'wait'],
  trophy: ['3715trophy1', 'trophy', 'kupa'],
  crown: ['tac', 'crown', 'kaptan'],
  boost: ['boost', 'ServerBooster', 'greenbooster'],
  money: ['para', 'cash', 'ecoin'],
  role: ['role', 'rol', 'roller'],
  channel: ['channel', 'forumkanal', 'talepkanal'],
  link: ['link', 'link1'],
  lock: ['lock', 'kilitlendi'],
  unlock: ['unlock', 'kilidacildi'],
  online: ['aktif', 'online', 'serveraktif'],
  offline: ['offline', 'deaktif'],
  log: ['taleplog', 'log'],
  refresh: ['yenile', 'refresh', 'yenilenme'],
  bell: ['notification', 'bell'],
  list: ['icons_list', 'liste', 'todolist'],
  id: ['id', 'usernametag'],
  tag: ['tag', 'Tag'],
  bot: ['bot', 'bot_robot'],
  kadin: ['kadin', 'woman'],
  football: ['icons_games', 'futbol', 'gol'],
  // --- limit varsa bunlar atlanır (öncelik düşük) ---
  question: ['soru', 'soru_isareti'],
  fire: ['fire', 'flame'],
  gift: ['gift', 'sandikodul'],
  chat: ['chat', 'mesaj'],
  forum: ['forum', 'sahne'],
  hammer: ['hammer', 'kick'],
  verify: ['verified', 'Verify', 'onaylandi'],
  camera: ['avatar', '4352_camera'],
  category: ['kategori', 'kategoriayarlar'],
  clock: ['clock', 'zamanasimi'],
};

module.exports = {
  serverName: 'Sunucu Adı',

  welcomeText:
    'Sunucumuza hoş geldin! Burada kendi kariyerini veya takımını yönetebilir, rolplay deneyimi yaşayabilirsin. Sunucuda aktif kalmak ve kurallara uymak şarttır.',

  // Komut öneki (.kstat, .emojikur için)
  prefix: '.',

  // 'button' => 4 buton | 'select' => açılır menü | 'both' => menü + butonlar
  panelMode: 'both',

  // Kayıt paneli (başvuru kanalı açan sistem) geçici olarak açık mı?
  // false => panel devre dışı (butonlar kilitli, başvuru kanalı açılmaz),
  // yetkililer `.k @kullanici isim <isim>` ile isim+rol vererek kaydeder.
  registerOpen: false,

  colors: {
    primary: 0x1db954,
    success: 0x2ecc71,
    danger: 0xe74c3c,
    warning: 0xf1c40f,
    info: 0x3498db,
    gold: 0xf5b301,
    blurple: 0x5865f2,
    dark: 0x16181d,
    violet: 0x9b59b6,
  },

  cooldowns: {
    ticketOpenMs: 30_000, // Aynı kullanıcı arka arkaya kanal açamasın
    callStaffMs: 60_000, // "Yetkili Çağır" butonu bekleme süresi
  },

  // Onay/Red sonrası kanalın silinme gecikmesi
  closeDelayMs: 5_000,

  // Opsiyonel bağlantılar (boş bırakılan butonlar gösterilmez)
  links: {
    rules: '', // ör. https://discord.com/channels/<sunucu>/<kurallar-kanali>
    invite: '', // ör. https://discord.gg/xxx
    site: '', // ör. https://ornek-site.com
  },

  // Hoş geldin mesajı detayları
  welcome: {
    milestoneStep: 100, // 100'er üyelik hedefi göster
    showInviter: true,
    showTrust: true,
  },

  /* ---------- Emoji kütüphanesi ---------- */
  emojiler: {
    // Kütüphane kök klasörü (data/emojis.json + emojis/ dosyaları)
    // Varsayılan olarak repodaki gömülü `emoji-library/` kullanılır.
    libraryPath: process.env.EMOJI_LIBRARY_PATH || path.join(__dirname, 'emoji-library'),
    // Sunucuda kurulan emoji adı öneki
    prefix: 'gl_',
    // Bot açıldığında eksik emojileri arka planda kursun mu?
    autoInstall: true,
    // Her yükleme arasındaki gecikme (429 koruması)
    delayMs: 400,
    keys: EMOJI_KEYS,
  },

  types: {
    uye: {
      label: 'Üye',
      emojiKey: 'user',
      roleKey: 'uye',
      channelPrefix: 'kayit',
      voice: false,
      description: 'Sunucuya normal üye olarak katıl.',
      fields: [
        { id: 'isim', label: 'İsim', placeholder: 'Örn: Ahmet', max: 24, pattern: NAME_RE },
      ],
      nick: (d) => d.isim,
    },

    kadin: {
      label: 'Kadın Üye',
      emojiKey: 'kadin',
      roleKey: 'kadin',
      channelPrefix: 'kadinkayit',
      voice: true, // Ses teyit odası da açılır
      description: 'Kadın üye kaydı (ses teyidi gerekir).',
      fields: [
        { id: 'isim', label: 'İsim', placeholder: 'Örn: Ayşe', max: 24, pattern: NAME_RE },
      ],
      nick: (d) => d.isim,
    },

    futbolcu: {
      label: 'Futbolcu',
      emojiKey: 'football',
      roleKey: 'futbolcu',
      channelPrefix: 'kayit',
      voice: false,
      description: 'Futbolcu olarak kariyerine başla.',
      fields: [
        { id: 'isim', label: 'İsim / Soyisim', placeholder: 'Örn: Arda Güler', max: 28, pattern: NAME_RE },
        { id: 'ulke', label: 'Ülke', placeholder: 'Örn: Türkiye', max: 24, pattern: TEXT_RE },
        {
          id: 'mevki',
          label: 'Mevki (Örn: OS, SF, TSL vb.)',
          placeholder: 'Örn: OS',
          max: 12,
          pattern: POS_RE,
          upper: true,
        },
      ],
      nick: (d) => `${d.isim} | ${d.mevki}`,
    },

    td: {
      label: 'Teknik Direktör',
      emojiKey: 'staff',
      roleKey: 'teknik',
      channelPrefix: 'kayit',
      voice: false,
      description: 'Bir kulübün başına geç.',
      fields: [
        { id: 'isim', label: 'İsim', placeholder: 'Örn: Mehmet', max: 24, pattern: NAME_RE },
        { id: 'takim', label: 'İstediği Takım / Kulüp Adı', placeholder: 'Örn: Galatasaray', max: 32, pattern: TEXT_RE },
      ],
      nick: (d) => `TD | ${d.isim}`,
    },
  },
};
