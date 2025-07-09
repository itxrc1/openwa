module.exports = {
    admin: false, // Set to true if only admins should use this
    name: 'runtime',
    alias: ['alive', 'uptime'],
    category: 'info',
    run: async (m, plugins) => {
        try {
            // Calculate the bot's uptime
            const _uptime = process.uptime() * 1000;
            const uptime = formatUptime(_uptime);

            // Send the uptime as a bold message
            await m.reply(`*Running for:* [ ${uptime} ]`);
        } catch (e) {
            await m.reply(`*Error calculating uptime:* ${e.message}`);
        }
    }
};

// Helper function to format uptime
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}
