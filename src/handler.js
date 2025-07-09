const config = require("../config.js")
const { isModuleInstalled } = require("./util.js")
const { isWhitelist } = require("./whitelist.js")
const { forwardToTelegram, forwardStatusToTelegram, forwardCallToTelegram } = require("./telegram.js")

/**
 * Handles incoming messages and forwards them to the appropriate plugins.
 */
async function message(m, plugins) {
  // Handle status updates (stories) - improved detection
  if (m.isStatus || m.chat.endsWith("@status") || m.chat.includes("status@broadcast")) {
    if (config.telegram.enabled && !m.fromMe) {
      try {
        global.log?.info(`📱 Processing status from ${m.name} (${m.sender.user})`)

        const statusData = {
          name: m.name || `Contact ${m.sender.user}`,
          number: m.sender.user,
          caption: m.body || "",
          type: m.type,
          media: null,
          timestamp: new Date(),
        }

        // Download media if available
        if (m.mimetype && !m.mimetype.startsWith("text/")) {
          try {
            statusData.media = await m.download()
            global.log?.info(`📱 Downloaded status media: ${m.mimetype}`)
          } catch (downloadError) {
            global.log?.warn("Failed to download status media:", downloadError.message)
          }
        }

        await forwardStatusToTelegram(statusData)
        global.log?.info(`📱 Status forwarded from ${m.name} (${m.sender.user})`)
      } catch (error) {
        global.log?.error("Error forwarding status to Telegram:", error)
      }
    }
    return // Don't process status updates further
  }

  // Forward regular messages to Telegram if enabled (not status messages)
  if (config.telegram.enabled && !m.fromMe && !m.isStatus) {
    try {
      await forwardToTelegram(m)
    } catch (error) {
      global.log?.error("Error forwarding to Telegram:", error)
    }
  }

  // Handle reply sessions
  if (m.cmd && m.quoted && global.bot.sessions.get(m.quoted.key.id)) {
    const sessions = global.bot.sessions.get(m.quoted.key.id)
    const opt = m.cmd.match(/^\d+/)

    if (!opt || opt[0] < 1 || opt[0] > sessions.length) {
      return m.reply(
        m.sender.user.startsWith("62") ? `Kamu tidak memasukkan nilai yang valid.` : `You don't enter valid value.`,
      )
    }

    try {
      await m.reply("⏱️")
      await sessions[Number(opt[0]) - 1]()
      await m.reply("✅")
    } catch (e) {
      await m.reply(`Error: ${e.message}`)
      await m.reply("❌")
    }
    return
  }

  if (!m.prefix) return
  if (!(await isWhitelist(m.sender.user))) {
    if (!m.isGroup) m.reply(config.whitelistMsg)
    return
  }

  // Filter and reload plugins properly
  const validPlugins = []
  for (const pluginPath of plugins) {
    try {
      // If it's already a plugin object, use it directly
      if (typeof pluginPath === "object" && pluginPath.name) {
        validPlugins.push(pluginPath)
        continue
      }

      // If it's a file path, require it
      if (typeof pluginPath === "string") {
        delete require.cache[require.resolve(pluginPath)]
        const plugin = require(pluginPath)
        if (plugin && typeof plugin === "object" && plugin.name) {
          validPlugins.push(plugin)
        }
      }
    } catch (e) {
      global.log?.error(`Failed loading plugin: ${e.message}`)
    }
  }

  if (isModuleInstalled("bot-plugins")) {
    try {
      const additionalPlugins = require("bot-plugins")
      if (Array.isArray(additionalPlugins)) {
        validPlugins.push(...additionalPlugins)
      }
    } catch (e) {
      global.log?.error(`Failed loading bot-plugins: ${e.message}`)
    }
  }

  const administrator = !!config.administrator.find((x) => x == m.sender.user)

  for (const plugin of validPlugins) {
    if (![plugin?.name, ...(plugin?.alias || [])].includes(m.cmd)) continue

    try {
      global.bot.sendPresenceUpdate("composing", m.chat.toString())
    } catch (e) {
      // Ignore presence update errors
    }

    if (plugin.admin && !administrator)
      return m.reply(
        m.sender.user.startsWith("62")
          ? "⚠️ Fitur ini hanya untuk administrator!"
          : "⚠️ This feature only for administrator!",
      )
    if (plugin.gconly && !m.isGroup)
      return m.reply(
        m.sender.user.startsWith("62")
          ? "⚠️ Fitur ini hanya dapat digunakan di dalam grup!"
          : "⚠️ This feature only can used inside group chat!",
      )
    if (plugin.gcadmin && !m.isGroupAdmin)
      return m.reply(
        m.sender.user.startsWith("62")
          ? "⚠️ Fitur Ini hanya tersedia untuk admin grup!"
          : "⚠️ This feature is only available for the group admin!",
      )

    try {
      await m.reply("⏱️")
      await plugin.run(m, validPlugins)
      await m.reply("✅")
    } catch (e) {
      await m.reply("❌")
      await m.reply(`Error: ${e.message}`)
      global.log?.error(`Error executing plugin: ${e}`)
    }
    return
  }
}

module.exports = { message }
