# Discord Kayıt Botu

discord.js v14 (Components v2) ile yazılmış, modüler kayıt botu. Arayüzde **hiçbir unicode emoji kullanılmaz**: tüm ikonlar sunucunun kendi custom emojileridir ve repoya gömülü `emoji-library/` kütüphanesinden kurulur.

## Kurulum

1. Node.js 18+ kurulu olmalı.
2. `npm install`
3. Proje kökünde `.env` dosyasını oluştur ve doldur:
   - `TOKEN` → bot tokeni
   - `GUILD_ID` → (opsiyonel) komutların anında görünmesi için sunucu ID'si
   - `EMOJI_LIBRARY_PATH` → (opsiyonel) farklı bir emoji kütüphanesi yolu; boş bırakılırsa repodaki gömülü `emoji-library/` kullanılır
4. Discord Developer Portal → Bot sekmesinde **Privileged Gateway Intents** altında şunları aç:
   - **Server Members Intent**
   - **Message Content Intent** (`.kstat` / `.emojikur` için)
5. Botu şu yetkilerle davet et: Kanalları Yönet, Rolleri Yönet, Takma Adları Yönet, **Emoji Yönet**, Kanalları Gör, Mesaj Gönder, Mesaj Geçmişini Oku, Bağlan, Davetleri Yönet (davet eden bilgisi için). **Bot rolü; Üye, Kadın Üye, Futbolcu ve Teknik Direktör rollerinin üstünde olmalı.**
6. `npm start`

## Kurulum komutları

```
/emojikur
/kayit-kur kanal:#kayit yetkili-rol:@Kayıt Yetkilisi kategori:Kayıtlar
          uye-rol:@Üye kadin-rol:@Kadın Üye futbolcu-rol:@Futbolcu teknik-rol:@Teknik Direktör
          hosgeldin-kanal:#hosgeldin log-kanal:#kayit-log
```

`hosgeldin-kanal` ve `log-kanal` opsiyoneldir. Komutu tekrar çalıştırarak ayarları güncelleyebilirsin.

## Emoji sistemi

- **Kaynak:** `emoji-library/data/emojis.json` indeksi + `emoji-library/emojis/` klasöründeki dosyalar (botun `EMOJI_KEYS` ile kullandığı emojiler repoya gömülüdür).
- **`/emojikur`** (veya `.emojikur`): `config.emojiler.keys` içindeki her anahtarı, kütüphanedeki dosyadan bulup `gl_<anahtar>` adıyla sunucuya yükler; canlı ilerleme paneli gösterir.
- **`data/emojis.json`:** kurulan emojilerin `<:gl_anahtar:id>` kaydı (yeniden kurulumda tekrar yüklenmez).
- **Çözüm sırası:** sunucu emojisi → kayıtlı harita → tipografik yedek (`✓`, `✕`, `◈` ...). Emoji kurulu değilse buton/select emojisi otomatik olarak atlanır.
- Bot açılışında `config.emojiler.autoInstall` açıkken eksik emojiler arka planda kurulur.
- Sunucu emoji limiti (`50/100/150/250`) dolduysa kalanlar atlanır; limit büyüyünce tekrar çalıştırın.
- Öncelikli anahtarlar `config.js` → `EMOJI_KEYS` içinde listelenen sıradadır (limit varsa ilk sıradakiler kurulur).

## Özellikler

- **Hoş geldin mesajı** — afiş (sunucu bannerı), üyelik sırası, hesap bilgileri, **hesap güven analizi** (0-100 puan + ilerleme çubuğu), **sunucu bilgileri** (kuruluş tarihi, üye sayısı, hedef milestone, kanal/rol/emoji sayıları, boost seviyesi) ve **davet eden** (davet takibi ile).
- **Kayıt paneli (geçici olarak KAPALI)** — `config.js → registerOpen: false` iken menü ve butonlar kilitlidir, form açılmaz ve hoş geldin mesajında "Kayıt Paneline Git" butonu görünmez. `true` yapınca eski akış (menü/4 buton → modal → başvuru kanalı) geri gelir.
- **`.k <@kullanici> [isim <isim>]` — hızlı kayıt (bağımsız sistem)**:
  1. İsim verilirse **doğrudan takma ad olarak uygulanır**,
  2. Açılan panelden **rol seçilir** → rol anında verilir, loglanır, `/kstat` sayacına işlenir (Teknik Direktör seçilirse takma ad `TD | İsim` olur).
  Panelde açık başvuru kanalı varsa "Başvuru Kanalını Kapat" butonu da çıkar. Örnek: `.k @Ahmet isim Ahmet Yılmaz`
- **Kayıt paneli akışı** (registerOpen: true) — Modal form, kullanıcıya özel gizli kayıt kanalı; kadın üye için ek **Ses Teyit Odası**; Onayla / Reddet (DM) / İsim Değiş / Üstlen + Yetkili Çağır.
- **`/ses` ve `.ses [#kanal]`** — botu ses kanalına sokar; kanal yazılmazsa bot çıkar. Yetki: Üyeleri Taşı / Administrator / Kayıt Yetkilisi.
- `/kstat [yetkili]` ve `.kstat [@yetkili]` — haftalık + toplam, grafikli.
- Veri `data/db.json` içinde saklanır (harici paket gerektirmez).

## Takma ad şablonları (`config.js`)

| Tür | Takma ad |
| --- | --- |
| Üye / Kadın Üye | `İsim` |
| Futbolcu | `İsim \| MEVKİ` |
| Teknik Direktör | `TD \| İsim` |

## Klasör yapısı

```
index.js
config.js          EMOJI_KEYS, emojiler, welcome, links, types, panelMode, registerOpen
emoji-library/     data/emojis.json (indeks) + emojis/ (botun kurduğu PNG'ler)
data/              db.json, emojis.json (kurulan emojiler)
src/
  commands/        kayit-kur.js, kstat.js, emojikur.js, ses.js
  events/          ready, guildMemberAdd, interactionCreate, messageCreate,
                   inviteCreate, inviteDelete, channelDelete
  interactions/
    buttons/       kayit_ac, kayit_onay, kayit_red, kayit_isim, kayit_ustlen,
                   kayit_cagir, kayit_kapat
    modals/        kayit_form, kayit_red_modal, kayit_isim_modal
    selects/       kayit_sec, kayit_hizli, kayit_hedef, kayit_rol
  handlers/        loader.js
  utils/           db, helpers, ui (Components v2: welcomeMessage, panelMessage,
                   kayitPanel, ticketMessage), ticket,
                   emojis (kütüphane + kurulum), invites (davet takibi),
                   analysis (güven/sunucu raporu)
```

Yeni bir buton/modal/komut eklemek için ilgili klasöre `{ name, execute }` (komutta `{ data, execute }`) dışa aktaran bir dosya eklemen yeterli.
