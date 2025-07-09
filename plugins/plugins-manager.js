const fs = require('fs');
const path = require('path');
const check = require('syntax-error');

module.exports = {
    admin: true,
    name: 'plugin-manager',
    alias: ['upp', 'rmp', 'sendp'],
    category: 'administrator',
    run: async (m) => {
		if (m.cmd === module.exports.name) {
			const text = m.sender.user.startsWith('62')
                ? `Gunakan perintah "${module.exports.alias.join('", "')}" untuk memanage plugin anda.`
                : `Use command "${module.exports.alias.join('", "')}" to manage your plugins.`;
            return await m.reply(text);
		}

        if (!m.text && m.cmd != 'upp') {
			const text = m.sender.user.startsWith('62')
                ? `Tolong gunakan perintah ini sesuai format berikut.\n\n${m.prefix+m.cmd} <nama plugins>`
                : `Please use this command according to the following format.\n\n${m.prefix+m.cmd} <plugins name>`;
            return await m.reply(text);
		}

		let data;
        const pluginsDir = path.resolve(__dirname, 'pmgr');
		let filePath = path.join(pluginsDir, `${m.text}.js`);
		if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
        switch (m.cmd) {
            case 'upp': // Upload Plugin
				if (m.mimetype.endsWith('javascript') && m.quoted?.mimetype?.endsWith('javascript') && !m.quoted?.text) {
					const text = m.sender.user.startsWith('62')
						? `Kamu tidak menyertakan dokumen yang valid`
						: `You don't include valid documents`;
					return await m.reply(text);
				}

				if (m.mimetype.endsWith('javascript')) {
					data = await m.download();
				} else if (m.quoted?.mimetype?.endsWith('javascript') || m.quoted?.mimetype === 'text/plain') {
					data = await m.quoted.download();
				}

				const err = check(data);
				if (err) {
					const text = m.sender.user.startsWith('62')
						? `Plugin tidak ditulis karena terjadi kesalahan.\n${err}`
						: `The plugin is not written because it contains errors.\n${err}`;
					return await m.reply(text);
				}

				try {
					if (!m.text) {
						const x = eval(data.toString());
						filePath = path.join(pluginsDir, `${x.name}.js`);
					}

                    await fs.writeFileSync(filePath, data);
					filePath = require.resolve(filePath);
					delete require.cache[filePath];
                    await m.reply(m.sender.user.startsWith('62') ? `Plugin ${m.text}.js berhasil diunggah!` : `Plugin ${m.text}.js uploaded successfully!`);
                } catch (err) {
                    await m.reply(m.sender.user.startsWith('62') ? `Gagal mengunggah plugin:\n${err.message}` : `Failed to upload plugin:\n${err.message}`);
                }
                break;

            case 'rmp': // Remove Plugin
                if (!fs.existsSync(filePath)) {
					const text = m.sender.user.startsWith('62')
						? `Plugin ${m.text}.js tidak ditemukan.`
						: `Plugin ${m.text}.js not found.`;
					return await m.reply(text);
                }

                try {
					data = require.resolve(filePath);
					delete require.cache[data];
                    await fs.unlinkSync(filePath);
                    await m.reply(m.sender.user.startsWith('62') ? `Plugin ${m.text}.js berhasil dihapus!` : `Plugin ${m.text}.js removed successfully!`);
                } catch (err) {
                    await m.reply(m.sender.user.startsWith('62') ? `Gagal menghapus plugin:\n${err.message}` : `Failed to remove plugin:\n${err.message}`);
                }
                break;

            case 'sendp': // Send Plugin
				if (!fs.existsSync(filePath)) {
					const text = m.sender.user.startsWith('62')
						? `Plugin ${m.text}.js tidak ditemukan.`
						: `Plugin ${m.text}.js not found.`;
					return await m.reply(text);
				}

                try {
                    data = fs.readFileSync(filePath);
					await m.reply({ document: data, mimetype: 'application/javascript', fileName: `${m.text}.js` }, m.sender.user.startsWith('62') ? `Nih` : `Here`);
                } catch (err) {
                    await m.reply(m.sender.user.startsWith('62') ? `Gagal mengambil plugin:\n${err.message}` : `Failed to send plugin:\n${err.message}`);
                }
                break;
        }
    }
};
