const axios = require('axios');

const FLASH_API_KEY = '806cf941653948be8d8049defd086b82';
const FLASH_API_URL = 'https://api.apiflash.com/v1/urltoimage';

async function takeScreenshot(url) {
    try {
        const apiUrl = `${FLASH_API_URL}?access_key=${FLASH_API_KEY}&url=${encodeURIComponent(url)}&format=png&fresh=true&full_page=true&quality=80&scroll_page=true&response_type=image&no_cookie_banners=true&no_ads=true&no_tracking=true`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error taking screenshot:', error);
        return null;
    }
}

module.exports = {
    admin: false,
    name: 'screenshot',
    alias: ['ws', 'webshot', 'ss'],
    category: 'tools',
    run: async (m) => {
        const url = m.text.trim();
        if (!url) {
            return m.reply('Please provide a website URL. For example: `screenshot https://example.com`');
        }

        const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
        if (!urlRegex.test(url)) {
            return m.reply('Invalid URL format. Please provide a valid website URL.');
        }

        const screenshotBuffer = await takeScreenshot(url);
        if (!screenshotBuffer) {
            return m.reply('Failed to take a screenshot of the website.');
        }

        await m.reply(screenshotBuffer, `> Screenshot: ${url}`);
    },
};
