const { randomBytes } = require('crypto');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Function to delay execution for a specified number of milliseconds
global.delay = int => new Promise(resolve => setTimeout(resolve, int));

/**
 * Generates a random ID of the specified length.
 * @param {number} [length=32] - The length of the ID to generate.
 * @param {string} [id=''] - The initial value of the ID.
 * @returns {string} - The generated ID in uppercase.
 */
function generateID(length = 32, id = '') {
    id += randomBytes(Math.floor((length - id.length) / 2)).toString('hex');
    while (id.length < length) id += '0';
    return id.toUpperCase();
}

function getVersion(getnew) {
    const verdata = path.join(__dirname, '..', 'data', 'version.json');
    if (getnew) {
        return (async () =>{
            try {
                const response = await axios.get('https://wppconnect.io/whatsapp-versions');
                const $ = cheerio.load(response.data);

                const versionInfo = $('.card__header h3').filter(function() {
                    const text = $(this).text();
                    return text.includes('stable') && text.includes('current');
                }).text().split(' ')[0];

                const version = versionInfo.split('.');
                await fs.writeFileSync(verdata, JSON.stringify(version), 'utf-8');
                return version;
            } catch (error) {
                log.error('Error fetching data:', error);
            }
        })()
    }

    if (fs.existsSync(verdata)) return require(verdata);
    return ['2','3000','1015910634-alpha'];
}

/**
 * Check whether the module has been installed.
 * @param {string} - The name of the module to be examined.
 * @returns {boolean} - Is installed.
 */
function isModuleInstalled(name) {
    try {
        // Check if module can be resolved
        require.resolve(name);
        return true;
    } catch {
        // If module cannot be resolved, check node_modules directory
        const modulePath = path.resolve('node_modules', name);
        return fs.existsSync(modulePath);
    }
}

/**
 * Serializes an object to a JSON string, converting `undefined` values to a specific string representation.
 *
 * This function uses `JSON.stringify` with a custom replacer function to handle `undefined` values.
 * Instead of omitting `undefined` values (as is the default behavior of `JSON.stringify`), 
 * this function converts them to the string `'undefined'` for visibility in the resulting JSON string.
 *
 * @param {Object} obj - The object to be serialized to a JSON string.
 * @returns {string} - A JSON string representation of the object, with `undefined` values converted to `'undefined'`.
 */
function stringify(obj) {
    return JSON.stringify(obj, (key, value) => value === undefined ? null : value, 2);
}


/**
 * Recursively scans a directory and returns a list of all files.
 * @param {string} dir - The directory to scan.
 * @param {string[]} [list=[]] - The list of files found.
 * @returns {string[]} - The list of files.
 */
function scanDir(dir, list = []) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir);

    for (let file of files) {
        file = path.resolve(dir, file);
        let stat = fs.statSync(file);
        stat.isDirectory() ? scanDir(file, list) : list.push(file);
    }
    return list;
}

module.exports = {
    getVersion,
    generateID,
    isModuleInstalled,
    stringify,
    scanDir
};
