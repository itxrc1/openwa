const axios = require('axios');

module.exports = {
    admin: false,
    name: 'soundcloud',
    alias: ['sc', 'scdl'],
    category: 'downloader',
    run: async (m) => {
        if (!m.text) {
            const text = m.sender.user.startsWith('62')
                ? `Untuk menggunakan fitur ini gunakan perintah seperti berikut.\n\n${m.prefix + m.cmd} <judul>`
                : `To use this feature, use the following command.\n\n${m.prefix + m.cmd} <title>`;
            return await m.reply(text);
        }

        const query = encodeURIComponent(m.text);
        const searchUrl = `https://deliriussapi-oficial.vercel.app/search/soundcloud?q=${query}&limit=15`;

        try {
            const searchResponse = await axios.get(searchUrl);
            const results = searchResponse.data.data;

            if (results.length === 0) {
                return await m.reply('No results found for your query.');
            }

            let text = '_*SoundCloud Downloader*_';
            results.forEach((result, index) => {
                text += `\n\n*${index + 1}. ${result.title}*\n*Artist:* ${result.artist}\n*Album:* ${result.album}\n*Link:* ${result.link}`;
            });

            const msg = await m.reply(text);
            const sessions = [];

            for (const [i, result] of results.entries()) {
                sessions.push(async () => {
                    const downloadUrl = `https://deliriussapi-oficial.vercel.app/download/soundcloud?url=${result.link}`;
                    const downloadResponse = await axios.get(downloadUrl);
                    const { title, data } = downloadResponse.data;

                    // Send thumbnail/image first
                    const imageUrl = data.imageURL;
                    let imageData;
                    if (imageUrl) {
                        imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                        await m.reply(Buffer.from(imageData.data), `_*SoundCloud Download*_\n\n*Title:* ${title}\n*Artist:* ${data.author.username}`);
                    } else {
                        await m.reply(`_*SoundCloud Download*_\n\n*Title:* ${title}\n*Artist:* ${data.author.username}`);
                    }

                    // Now send the audio
                    const audioBuffer = await axios.get(data.url, { responseType: 'arraybuffer' });
                    await m.reply(Buffer.from(audioBuffer.data), 'Here is your download:');
                });
            }

            bot.sessions.set(msg.key.id, sessions);
            return;

        } catch (error) {
            console.error('Error:', error);
            return await m.reply('An error occurred while processing your request. Please try again.');
        }
    }
};
