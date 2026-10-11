const config = require('../../../config');
const { sanitize } = require('../../utils/helpers');
const { precheck, createRegistration, safeReply, EPH } = require('../../utils/ticket');
const E = require('../../utils/emojis');

// Başvuru formu gönderildi: kayit_form:<tür>
module.exports = {
  name: 'kayit_form',
  async execute(interaction, args) {
    const typeKey = args[0];
    const type = config.types[typeKey];
    if (!type) return safeReply(interaction, `${E.str('cross', interaction.guild)} Geçersiz kayıt türü.`);

    // Girdileri temizle ve doğrula
    const data = {};
    for (const f of type.fields) {
      let value = sanitize(interaction.fields.getTextInputValue(f.id), f.max);
      if (f.upper) value = value.toLocaleUpperCase('tr-TR');
      if (value.length < 2 || !f.pattern.test(value)) {
        return safeReply(
          interaction,
          `${E.str('cross', interaction.guild)} **${f.label}** alanı geçersiz. Lütfen yalnızca harf/rakam kullan ve tekrar dene.`,
        );
      }
      data[f.id] = value;
    }

    if (!(await precheck(interaction, typeKey))) return;

    await interaction.deferReply({ flags: EPH });
    try {
      const channel = await createRegistration(interaction, typeKey, data);
      await interaction.editReply(`${E.str('ticket', interaction.guild)} Başvurun alındı! Kayıt kanalın: ${channel}`);
    } catch (err) {
      console.error('[kayit_form]', err);
      await interaction.editReply(
        `${E.str('cross', interaction.guild)} Kayıt kanalı oluşturulamadı. Botun kanal yönetme yetkisi ve kategori ayarı kontrol edilmeli; lütfen yetkiliye bildir.`,
      );
    }
  },
};
