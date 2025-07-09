const { get } = require('axios');

module.exports = {
    admin: false,
    name: 'saavn',
    alias: ['sa', 'saavnsearch', 'saavndl'],
    category: 'downloader',
    run: async (m) => {
        if (!m.text) {
            const text = m.sender.user.startsWith('62')
                ? `Untuk menggunakan fitur ini gunakan perintah seperti berikut.\n\n${m.prefix + m.cmd} <judul>`
                : `To use this feature, use the following command.\n\n${m.prefix + m.cmd} <title>`;
            return await m.reply(text);
        }

        try {
            const query = m.text.trim();
            const searchUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`;
            const { data } = await get(searchUrl);

            if (!data.success || data.data.results.length === 0) {
                return await m.reply('No results found.');
            }

            let text = '_*Saavn Downloader*_';
            text += m.sender.user.startsWith('62')
                ? '\nBalas dengan angka sesuai konten yang ingin di unduh.'
                : '\nReply with the number of the song you want to download.';

            const sessions = [];
            for (const [i, result] of data.data.results.entries()) {
                text += m.sender.user.startsWith('62')
                    ? `\n\n*${i + 1}. ${result.name}*\n*Artis:* ${result.artists.primary[0].name}\n*Album:* ${result.album.name}\n*Tautan:* ${result.url}`
                    : `\n\n*${i + 1}. ${result.name}*\n*Artist:* ${result.artists.primary[0].name}\n*Album:* ${result.album.name}\n*Link:* ${result.url}`;

                sessions.push(async () => {
                    // Send the thumbnail with song details
                    const imageUrl = result.image.find(img => img.quality === '500x500').url || result.image[0].url;

                    if (imageUrl) {
                        const imageData = await get(imageUrl, { responseType: 'arraybuffer' });
                        await m.reply(Buffer.from(imageData.data), `_*Saavn Downloader*_\n\n *${result.name}*\n *Artist:* ${result.artists.primary[0].name}`);
                    } else {
                        await m.reply(`_*Saavn Downloader*_\n\n *Title:* ${result.name}\n *Artist:* ${result.artists.primary[0].name}`);
                    }
                    // Now send the audio
                    const downloadUrl = result.downloadUrl.find(d => d.quality === '320kbps').url;
                    const audioBuffer = await get(downloadUrl, { responseType: 'arraybuffer' });

                    // Send the audio as a buffer
                    await m.reply(Buffer.from(audioBuffer.data), 'Here:');
                });
            }

            const msg = await m.reply(text);
            bot.sessions.set(msg.key.id, sessions);
            return;

        } catch (error) {
            console.error('Error:', error);
            return await m.reply('An error occurred while processing your request. Please try again.');
        }
    }
}
