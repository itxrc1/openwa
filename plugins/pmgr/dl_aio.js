const { get } = require('axios');

module.exports = {
    admin: false,
    name: 'aio',
    alias: ['aiol', 'allinonedl', 'alldownload'],
    category: 'downloader',
    run: async (m) => {
        if (!m.text) {
            const helpText = m.sender.user.startsWith('62')
                ? `Untuk menggunakan fitur ini, gunakan perintah seperti berikut:\n\n${m.prefix + m.cmd} <URL video>`
                : `To use this feature, use the following command:\n\n${m.prefix + m.cmd} <video URL>`;
            return await m.reply(helpText);
        }

        try {
            const videoUrl = m.text.trim();
            const apiUrl = `https://bk9.fun/download/alldownload?url=${encodeURIComponent(videoUrl)}`;
            const { data } = await get(apiUrl);

            if (!data.status || !data.BK9) {
                return await m.reply('No downloadable content found for the provided URL.');
            }

            const videoInfo = data.BK9;
            const title = videoInfo.title || 'Unknown Title';
            const quality = m.cmd === 'aio' ? 'High' : 'Low';
            const downloadUrl = quality === 'High' ? videoInfo.high : videoInfo.low;

            const videoBuffer = await get(downloadUrl, { responseType: 'arraybuffer' });

            await m.reply(
                {
                    video: Buffer.from(videoBuffer.data),
                    caption: `*Title:* ${title}\n*Quality:* ${quality}`,
                }
            );
        } catch (error) {
            console.error('Error:', error);
            await m.reply('An error occurred while processing your request. Please try again.');
        }
    }
};
