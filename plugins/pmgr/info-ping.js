const performanceNow = require('performance-now');

module.exports = {
    admin: false,
    name: 'ping',
    alias: ['latency', 'p'],
    category: 'info',
    desc: 'Bot speed latency',
    run: async (m) => {
        try {
            // Record the start time
            const start = performanceNow();

            // Simulate a delay to measure latency
            await new Promise(resolve => setTimeout(resolve, 100)); 

            // Calculate latency
            const latency = (performanceNow() - start).toFixed(2);

            // Send the ping result
            await m.reply(`*Pong!* [ ${latency} ms ]`);
        } catch (error) {
            console.error('Error in ping plugin:', error);
            await m.reply('🚩 An error occurred while measuring latency.');
        }
    }
};
