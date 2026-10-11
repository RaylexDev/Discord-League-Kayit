const fs = require('fs');
const path = require('path');

function requireDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => {
      try {
        return require(path.join(dir, f));
      } catch (err) {
        console.error(`[loader] ${f} yüklenemedi:`, err);
        return null;
      }
    })
    .filter(Boolean);
}

function loadCommands(client) {
  for (const cmd of requireDir(path.join(__dirname, '..', 'commands'))) {
    if (!cmd.data || !cmd.execute) continue;
    client.commands.set(cmd.data.name, cmd);
  }
  console.log(`[loader] ${client.commands.size} komut yüklendi.`);
}

function loadEvents(client) {
  let count = 0;
  for (const ev of requireDir(path.join(__dirname, '..', 'events'))) {
    if (!ev.name || !ev.execute) continue;
    const handler = (...args) =>
      Promise.resolve(ev.execute(...args, client)).catch((err) =>
        console.error(`[event:${ev.name}]`, err),
      );
    if (ev.once) client.once(ev.name, handler);
    else client.on(ev.name, handler);
    count++;
  }
  console.log(`[loader] ${count} event yüklendi.`);
}

function loadInteractions(client) {
  const base = path.join(__dirname, '..', 'interactions');
  const groups = { buttons: client.buttons, modals: client.modals, selects: client.selects };
  for (const [folder, collection] of Object.entries(groups)) {
    for (const h of requireDir(path.join(base, folder))) {
      if (!h.name || !h.execute) continue;
      collection.set(h.name, h);
    }
  }
  console.log(
    `[loader] ${client.buttons.size} buton, ${client.modals.size} modal, ${client.selects.size} select yüklendi.`,
  );
}

module.exports = { loadCommands, loadEvents, loadInteractions };
