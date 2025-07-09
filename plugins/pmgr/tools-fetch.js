const axios = require('axios');
const { format } = require('util');

module.exports = {
    admin: false,
    name: 'fetch',
    alias: ['get', 'fetch'],
    category: 'tools',
    help: ['fetch <URL>'],

    run: async (m) => {
        const { text } = m;

        // Validate URL input
        if (!/^https?:\/\//.test(text)) {
            return m.reply('Parameter *URL* must start with http:// or https://');
        }

        // Parse the URL and set up the origin for the referer header
        let { href: url, origin } = new URL(text);

        try {
            // Fetch the content from the URL
            const res = await axios.get(url, { headers: { referer: origin }, responseType: 'arraybuffer' });

            // Check the content length to avoid fetching too large content
            const contentLength = res.headers['content-length'];
            if (contentLength > 100 * 1024 * 1024) { // 100 MB limit
                throw new Error(`Content-Length: ${contentLength} exceeds the limit.`);
            }

            // Check the content type to determine how to handle the response
            const contentType = res.headers['content-type'];
            if (!/text|json/.test(contentType)) {
                // If the content type is not text or json, send the file directly
                await m.reply(`Downloading and sending file from ${url}...`);
                return await m.reply(res.data, 'file', text);
            }

            // If the content type is text or json, process it as text
            let txt = res.data;

            try {
                // Try to parse as JSON and format it nicely
                txt = format(JSON.parse(txt.toString()));
            } catch (e) {
                // If parsing fails, treat it as plain text
                txt = txt.toString();
            } finally {
                // Send the text response, limited to WhatsApp's maximum message length
                m.reply(txt.slice(0, 65536)); // WhatsApp's max message length is 65,536 characters
            }
        } catch (error) {
            console.error('Error fetching URL:', error);
            m.reply('There was an error fetching the URL. Please make sure the URL is correct and try again.');
        }
    },
};
