const fs = require('fs');
const path = require('path');
const { post } = require('axios');
const config = require('../config.js');
const whitelistFilePath = path.join(__dirname, '..', 'data', 'whitelist.json');
let whitelist = {};

/**
 * Adds a user to the whitelist with an expiration timestamp.
 *
 * This function adds a user to the whitelist and sets an expiration timestamp.
 * It then saves the updated whitelist to a JSON file.
 *
 * @param {string} user - The user to be added to the whitelist.
 * @param {number} expiration - The expiration timestamp for the whitelist entry (UNIX timestamp in milliseconds).
 */
function addWhitelist(user, expiration) {
    const now = Date.now()
    if (whitelist[user] && whitelist[user] > now) {
        whitelist[user] += expiration
    } else {
        whitelist[user] = expiration + now;
    }
    fs.writeFileSync(whitelistFilePath, JSON.stringify(whitelist, null, 0), 'utf8');
}

/**
 * Checks if a user is whitelisted.
 *
 * This function checks if a given user is in the whitelist and if their
 * whitelisting has not expired. If whitelisting is disabled in the configuration,
 * it always returns true. It checks both the configuration's whitelist and the
 * dynamically loaded whitelist.
 *
 * @param {string} user - The user to check.
 * @returns {boolean} - Returns true if the user is whitelisted and not expired, false otherwise.
 */
async function isWhitelist(user) {
    if (!config.whitelist) return true;
    if (config.administrator.find(x => x == user)) return true;
    if (config.whitelistUsr.find(x => x == user)) return true;

    if (config.whitelistSrv) {
        const body = { user };
        const { data } = await post(config.whitelistSrv, body, {validateStatus: () => true});
        if (data?.whitelisted) return true;
    }

    let expTimestamp = whitelist[user];
    return (expTimestamp && expTimestamp > Date.now());
}

// Load the whitelist if whitelisting is enabled in the configuration
if (config.whitelist && fs.existsSync(whitelistFilePath)) {
    Object.assign(whitelist, JSON.parse(fs.readFileSync(whitelistFilePath)));
}

module.exports = {
    isWhitelist,
    addWhitelist
}
