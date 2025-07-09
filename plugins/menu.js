const { botName } = require("../config.js")

module.exports = {
  admin: false,
  name: "menu",
  alias: ["m"],
  category: "info",
  run: async (m, plugins) => {
    let text = `▌│█║▌║▌║ *${botName}* ║▌║▌║█│▌\nHi *${m.name}*, `

    // Fix the undefined error by checking if sender exists and extracting user properly
    const userNumber = m.sender ? m.sender.split("@")[0] : ""
    const isIndonesian = userNumber.startsWith("62")

    text += isIndonesian ? "berikut adalah daftar fitur yang tersedia." : "here is the list of available features."

    const categories = {}

    for (const plugin of plugins) {
      if (typeof plugin.category !== "string") continue
      if (!categories[plugin.category]) categories[plugin.category] = []
      categories[plugin.category].push(plugin.name)
    }

    for (const category of Object.keys(categories).sort()) {
      text += `\n\n*# ${category.replace(/\b\w/g, (match) => match.toUpperCase())}*`
      for (const name of categories[category].sort()) {
        text += `\n- ${name}`
      }
    }

    // to appreciate the developer please don't lose this credit
    text += `\n\n> © Open Source WhatsApp Bot\n> https://github.com/KilluaBot/open-wabot`
    await m.reply(text)
  },
}
