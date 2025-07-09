module.exports = {
  // Debug mode configuration
  debug: false, // Set to true to enable debug mode

  // Anti-call feature configuration
  antiCall: false, // Set to false since we're only logging calls, not processing them

  // Pairing mode configuration
  usePairing: false, // Set to false since we're using manual session

  // Auto read configuration
  autoReadMSG: true, // Always mark message as readed
  autoReadSW: true, // Make bot can read story

  // Prefix configuration
  prefixes: ["!", ">", "$", ".", "-", "+", "?", "#", "@", "/", "&", ",", "ow!"], // Add the character you want to use as a prefix

  // Session configuration
  session: {
    type: "local", // Options: "mongodb", "firebase", "local"
    url: "mongodb+srv://itxcriminal:qureshihashmI1@cluster0.jyqy9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", // MongoDB URL
  },

  // Database configuration
  database: {
    enabled: true, // Enable database functionality
    type: "mongodb", // Options: "mongodb", "sqlite", "local"
    url: "mongodb+srv://itxcriminal:qureshihashmI1@cluster0.jyqy9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", // MongoDB connection URL
    name: "open_wabot", // Database name
    collections: {
      users: "users",
      groups: "groups",
      messages: "messages",
      telegram_topics: "telegram_topics",
      settings: "settings",
      profile_pictures: "profile_pictures", // New collection for tracking profile pictures
    },
  },

  // Bot information
  botName: "Open WABOT", // Name of the bot
  botNumber: "923018706705", // Phone number of the bot

  // Administrators list
  administrator: [
    "923018706705", // Your number as admin
    "6281654976901", // Phone number of the first administrator
    "6285175023755", // Phone number of the second administrator
  ],

  // Whitelist configuration
  whitelist: false, // Set to true to enable whitelist feature
  whitelistSrv: "", // Servers that provide whitelists
  whitelistMsg:
    "Mohon maaf, bot sedang dalam mode daftar putih. Silahkan hubungi admin untuk mendapatkan akses.\n\nSorry, the bot is in whitelist mode. Please contact the admin to get access.\n\nADMIN: <your phone number>", // Messages to be sent to users when they are not allowed to use bots
  whitelistUsr: [
    "923018706705", // Your number in whitelist
  ],

  // Telegram Bridge Configuration
  telegram: {
    enabled: true, // Set to true to enable Telegram bridge
    botToken: "6817290645:AAGHqXG76oU0fZe0pBqySe01VoJ39k75lUk", // Your Telegram bot token
    groupId: "-1002680228642", // Telegram group/supergroup ID where messages will be forwarded
    adminIds: [6387028671], // Your Telegram user ID who can manage the bridge
    forwardMedia: true, // Forward images, videos, documents
    createTopics: true, // Create topics for each WhatsApp contact (requires supergroup with topics enabled)
    confirmationMode: "reaction", // Options: "reaction", "message", "none" - How to confirm message delivery
    sendProfilePicture: true, // Send contact profile picture when creating topic
    sendInfoCard: true, // Send information card when creating topic (pinned message with contact details)
    monitorProfileChanges: true, // Monitor and send notifications when contacts change their profile pictures
  },
}
