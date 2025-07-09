const { addWhitelist } = require('../src/whitelist.js');

module.exports = {
    admin: true,
    name: 'whitelist',
    alias: [],
    category: 'administrator',
    run: async (m, plugins) => {
        if (!m.text || !m.text.match(/(\+?\d[\d\s-]*)\s+(\d+)/)) {
            const text = m.sender.user.startsWith('62')
                ? `Untuk menggunakan fitur ini silahkan ketikkan perintah seperti berikut.\n\n${m.prefix+m.cmd} <nomor> <durasi dengan satuan hari>`
                : `To use this feature, please type the following command.\n\n${m.prefix+m.cmd} <phone> <duration in days>`;
            return await m.reply(text);
        }

        const arg = m.text.match(/(\+?\d[\d\s-]*)\s+(\d+)/);
        const phone = arg[1].replace(/\D/g, '');
        const duration = Number(arg[2]) * 24 * 60 * 60 * 1000;
        addWhitelist(phone, Date.now() + duration)
        const text = m.sender.user.startsWith('62')
            ? `Berhasil menambahkan @${phone} kedalam daftar putih selama ${arg[2]} hari`
            : `Successfully added @${phone} to the whitelist for ${arg[2]} days`
        await m.reply(text)
    }
}
