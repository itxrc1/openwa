const os = require('os');
const axios = require('axios');
const { execSync } = require('child_process');

module.exports = {
    admin: false, // Set to true if only admins should use this
    name: 'server',
    alias: ['info', 'sysinfo'],
    category: 'info',
    run: async (m, plugins) => {
        try {
            // Fetch server location and ISP information
            const serverInfo = await fetchJson('http://ip-api.com/json');

            // Calculate CPU usage and get disk usage
            const cpuUsage = calculateCPUUsage();
            const diskUsage = getDiskUsage();

            // Format the message
            const caption = `
*Server Information*

*Hostname:* ${os.hostname()}
*Platform:* ${os.platform()}
*OS:* ${os.type()} (${os.arch()} / ${os.release()})
*Node.js Version:* ${process.version}
*Processor:* ${os.cpus()[0].model} (${os.cpus().length} cores)
*Load Average:* ${os.loadavg().map(avg => avg.toFixed(2)).join(', ')}
*CPU Usage:* ${cpuUsage}%
*Uptime:* ${formatUptime(os.uptime())}

*Memory*
*Total Memory:* ${formatSize(os.totalmem())}
*Used Memory:* ${formatSize(process.memoryUsage().rss)}
*Free Memory:* ${formatSize(os.freemem())}

*Disk Usage*
*Total Disk:* ${diskUsage.total}
*Used Disk:* ${diskUsage.used}
*Free Disk:* ${diskUsage.free}

*Network Information*
*Location:* ${serverInfo.city}, ${serverInfo.country}
*ISP:* ${serverInfo.isp}
*IP Address:* ${getNetworkInterfaces()}
${global.footer || ''}
            `.trim();

            // Send the formatted message
            await m.reply(caption);
        } catch (e) {
            await m.reply(`*Error fetching server info:* ${e.message}`);
        }
    }
};

// Helper function to fetch JSON data
async function fetchJson(url) {
    const response = await axios.get(url);
    return response.data;
}

// Helper function to format file sizes
function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Helper function to get network interfaces
function getNetworkInterfaces() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter(iface => iface.family === 'IPv4' && !iface.internal)
        .map(iface => iface.address)
        .join(', ');
}

// Helper function to calculate CPU usage
function calculateCPUUsage() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b), 0);
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return ((1 - idle / total) * 100).toFixed(2);
}

// Helper function to get disk usage
function getDiskUsage() {
    try {
        const output = execSync('df -h /').toString().split('\n')[1].split(/\s+/);
        return {
            total: output[1],
            used: output[2],
            free: output[3],
        };
    } catch {
        return { total: 'Unknown', used: 'Unknown', free: 'Unknown' };
    }
}
