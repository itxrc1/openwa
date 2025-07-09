// Define the plugin
module.exports = {
    admin: true,
    name: 'restart',
    alias: ['restart', 'reset'],
    category: 'administrator',
    help: ['restart - Restarts the bot.'],

    run: async (m) => {
        // Send a reply indicating that the bot is restarting
        await m.reply('Restarting...');

        // Delay for 5 seconds before initiating the restart
        setTimeout(() => {
            // Send a restart signal to the process
            process.send({ cmd: 'restart' });
        }, 5000);
    },
};
