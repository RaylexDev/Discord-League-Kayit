require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadEvents, loadInteractions } = require('./src/handlers/loader');
const db = require('./src/utils/db');

if (!process.env.TOKEN) {
  console.error('[HATA] .env dosyasında TOKEN tanımlı değil.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // guildMemberAdd + rol/takma ad işlemleri (Privileged)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildInvites, // inviteCreate/inviteDelete + "davet eden" bilgisi
    GatewayIntentBits.GuildVoiceStates, // /ses — botun ses kanalına bağlanması
    GatewayIntentBits.MessageContent, // .kstat öneki komutu için (Privileged)
  ],
  partials: [Partials.GuildMember],
  allowedMentions: { parse: [], repliedUser: false },
});

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selects = new Collection();

db.init();
loadCommands(client);
loadInteractions(client);
loadEvents(client);

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

const shutdown = () => {
  db.flush();
  client.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(process.env.TOKEN).catch((err) => {
  console.error('[HATA] Giriş yapılamadı:', err.message);
  process.exit(1);
});
