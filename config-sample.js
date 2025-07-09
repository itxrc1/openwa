module.exports = {
    // Debug mode configuration
    debug: false, // Set to true to enable debug mode

    // Anti-call feature configuration
    antiCall: true, // Set to true to enable anti-call feature

    // Pairing mode configuration
    usePairing: false, // Set to true to use pairing mode

    // Auto read configuration
    autoReadMSG: true, // Always mark message as readed
    autoReadSW: true, // Make bot can read story

    // Prefix configuration
    prefixes: ["!", ">", "$", ".", "-", "+", "?", "#", "@", "/", "&", ",", "ow!"], // Add the character you want to use as a prefix

    // Session configuration
    session: {
        type: "local",  // Options: "mongodb", "firebase", "local"
        url: "mongodb://username:password@host:port/database?options" // Required for MongoDB
    },

    // Bot information
    botName: "Open WABOT", // Name of the bot
    botNumber: "6285176765422", // Phone number of the bot

    // Administrators list
    administrator: [
        "6281654976901", // Phone number of the first administrator
        "6285175023755"  // Phone number of the second administrator
    ],

    // Whitelist configuration
    whitelist: false, // Set to true to enable whitelist feature
    whitelistSrv: "", // Servers that provide whitelists
    whitelistMsg: "Mohon maaf, bot sedang dalam mode daftar putih. Silahkan hubungi admin untuk mendapatkan akses.\n\nSorry, the bot is in whitelist mode. Please contact the admin to get access.\n\nADMIN: <your phone number>", // Messages to be sent to users when they are not allowed to use bots 
    whitelistUsr: [
        "6285176765422" // Phone number of the whitelisted user
    ]
};
