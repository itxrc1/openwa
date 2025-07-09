const { execSync } = require('child_process');
const { format } = require('util');

module.exports = {
    admin: true,
    name: 'exec',
    alias: ['>', '$'],
    category: 'administrator',
    run: async (m, plugins) => {
        let data;
        switch (m.cmd){
            case '>':
                try {
                    if (!m.text) return;
                    data = m.text.includes('return') 
                        ? await eval(`(async () => { ${m.text} })()`)
                        : await eval(`(async () => { return ${m.text} })()`);
                    await m.reply(format(data));
                } catch (e) {
                    await m.reply(format(e));
                }
                break;

            default:
                if (!m.text) return;
                await m.reply('Executing...');
                try {
                    data = execSync(m.text);
                    await m.reply(data.toString());
                } catch (e) {
                    await m.reply(e.message);
                }
                break;
        }
    }
}
