const { Boom } = require("@hapi/boom")
const pino = require("pino")
const pretty = require("pino-pretty")
const makeWASocket = require("@whiskeysockets/baileys").default
const {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  jidDecode,
} = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const { loadAuthState } = require("./src/session.js")
const { serialize } = require("./src/serializer.js")
const { message } = require("./src/handler.js")
const { saveMessage, saveAllGroupMetadata, updateGroupMetadata, removeGroupMetadata } = require("./src/store.js")
const { scanDir } = require("./src/util.js")
const { debug, antiCall, autoReadMSG, autoReadSW, usePairing, botNumber, config } = require("./config.js")
const { initTelegramBot, getTelegramBotInfo, forwardCallToTelegram } = require("./src/telegram.js")
const { initDatabase, DatabaseOps } = require("./src/database.js")
const path = require("path")
const fs = require("fs")

// Initialize logging
const log = pino(
  pretty({
    colorize: true,
    minimumLevel: debug ? "trace" : "info",
    sync: true,
  }),
)

// Global variables
global.bot = {}
global.plugins = []
global.log = log
let store
let isStarting = false
let telegramBot = null

// Prevent multiple instances
if (global.botInstance) {
  log.warn("Bot instance already exists, exiting...")
  process.exit(0)
}
global.botInstance = true

// Safe object logging function
function safeStringify(obj, maxDepth = 2) {
  const seen = new WeakSet()
  return JSON.stringify(
    obj,
    (key, val) => {
      if (val != null && typeof val === "object") {
        if (seen.has(val)) return "[Circular]"
        seen.add(val)
      }
      return val
    },
    2,
  )
}

async function startBot() {
  if (isStarting) {
    log.warn("Bot is already starting, skipping...")
    return
  }

  isStarting = true

  try {
    log.info("🚀 Starting Open WABOT...")

    // Initialize database first
    const database = await initDatabase()
    if (database) {
      const stats = await DatabaseOps.getStats()
      if (stats) {
        log.info(`📊 Database: ${stats.type} - Connected`)
        if (stats.collections) {
          log.info(
            `📋 Collections: Users(${stats.collections.users || 0}), Messages(${stats.collections.messages || 0}), Topics(${stats.collections.telegram_topics || 0})`,
          )
        }
      }
    }

    // Initialize Telegram bot only once
    if (!telegramBot) {
      telegramBot = initTelegramBot()
      if (telegramBot) {
        const botInfo = await getTelegramBotInfo()
        if (botInfo) {
          log.info(`📱 Telegram bot initialized: @${botInfo.username}`)
        }
      }
    }

    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion()
    log.info(`Using WA v${version.join(".")}, isLatest: ${isLatest}`)

    // Load authentication state
    const { state, saveCreds } = await loadAuthState()

    // Check if session is valid
    const sessionValid = state.creds.registered && state.creds.me

    if (sessionValid) {
      log.info("✅ Using existing session - Device already registered")
      log.info(`📱 Bot Number: ${state.creds.me?.id || "Unknown"}`)
      log.info(`👤 Bot Name: ${state.creds.me?.name || "Unknown"}`)
    } else {
      log.info("⚠️ Session not registered or invalid, will need authentication")
    }

    // Create WhatsApp socket
    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      fireInitQueries: false,
      emitOwnEvents: true,
      browser: ["Open-WABOT", "Chrome", "1.0.0"],
      printQRInTerminal: !usePairing && !sessionValid,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      getMessage: async (key) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id)
          return msg?.message || undefined
        }
        return { conversation: "hello" }
      },
    })

    // Set global bot reference
    global.bot = sock
    global.bot.sessions = new Map()

    // Add utility functions to bot
    const bot = global.bot
    bot.decodeJID = (jid) => {
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid.trim()
      } else return jid.trim()
    }

    // Load plugins only once
    if (global.plugins.length === 0) {
      const pluginDir = path.join(__dirname, "plugins")

      if (fs.existsSync(pluginDir)) {
        const pluginFiles = scanDir(pluginDir).filter((file) => file.endsWith(".js"))

        for (const file of pluginFiles) {
          try {
            delete require.cache[require.resolve(file)]
            const plugin = require(file)
            if (plugin && typeof plugin === "object" && plugin.name) {
              global.plugins.push(plugin)
              log.info(`Loaded plugin: ${plugin.name}`)
            }
          } catch (error) {
            log.error(`Failed to load plugin ${file}: ${error.message}`)
          }
        }
      }

      log.info(`Loaded ${global.plugins.length} plugins`)
    } else {
      log.info(`Using ${global.plugins.length} already loaded plugins`)
    }

    // Event handlers
    sock.ev.process(async (events) => {
      // Connection updates
      if (events["connection.update"]) {
        const update = events["connection.update"]
        const { connection, lastDisconnect, qr } = update

        if (qr && !usePairing && !sessionValid) {
          log.info("📱 QR Code received, scan with WhatsApp:")
          qrcode.generate(qr, { small: true })
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut

          log.info(
            `Connection closed due to ${lastDisconnect?.error?.message || "unknown error"}, reconnecting: ${shouldReconnect}`,
          )

          if (statusCode === DisconnectReason.restartRequired) {
            log.info("Restart required, restarting...")
            isStarting = false
            setTimeout(() => startBot(), 3000)
          } else if (statusCode === DisconnectReason.loggedOut) {
            log.error("🚨 Device logged out! Clearing session and requiring new QR scan...")

            try {
              // Clear session files manually
              const sessionDir = path.join(__dirname, "data", "session")
              const credsPath = path.join(sessionDir, "creds.json")

              if (fs.existsSync(credsPath)) {
                fs.unlinkSync(credsPath)
                log.info("✅ Credentials file removed")
              }

              // Remove app state files
              if (fs.existsSync(sessionDir)) {
                const files = fs.readdirSync(sessionDir)
                for (const file of files) {
                  if (file.startsWith("app-state-sync-")) {
                    fs.unlinkSync(path.join(sessionDir, file))
                    log.info(`✅ Removed ${file}`)
                  }
                }
              }

              log.info("🔄 Session cleared. Restarting to show QR code...")

              // Send signal to controller if running as child process
              if (process.send) {
                process.send("unauthorized")
              } else {
                // If not running as child, restart directly
                isStarting = false
                setTimeout(() => startBot(), 3000)
              }
            } catch (error) {
              log.error("Error clearing session:", error.message)
              isStarting = false
              setTimeout(() => startBot(), 3000)
            }
          } else if (shouldReconnect) {
            isStarting = false
            setTimeout(() => startBot(), 3000)
          } else {
            log.error("Connection closed permanently")
            process.exit(1)
          }
        } else if (connection === "connecting") {
          log.info("🔄 Connecting to WhatsApp...")
        } else if (connection === "open") {
          log.info("✅ Connection opened successfully!")
          log.info(`📱 Connected as: ${sock.user?.name || "Unknown"} (${sock.user?.id || "Unknown"})`)

          // Load all group metadata
          try {
            const groups = await sock.groupFetchAllParticipating()
            saveAllGroupMetadata(groups)
            log.info(`📊 Loaded ${Object.keys(groups).length} groups`)
          } catch (error) {
            log.error("Error loading groups:", error)
          }

          // Send a test message to yourself (optional)
          try {
            let startupMessage = `🤖 *Open WABOT* is now online!\n\n⏰ Started at: ${new Date().toLocaleString()}\n🔧 Plugins loaded: ${global.plugins.length}`

            if (database) {
              const stats = await DatabaseOps.getStats()
              startupMessage += `\n🗄️ Database: ${stats ? stats.type : "Connected"}`
            }

            if (telegramBot) {
              startupMessage += `\n📱 Telegram bridge: ✅ Active`
              startupMessage += `\n📊 Status & Call forwarding enabled`
            }

            startupMessage += `\n\nSend *!menu* to see available commands.`

            await sock.sendMessage(sock.user.id, { text: startupMessage })
            log.info("✅ Startup message sent")
          } catch (error) {
            log.error("Could not send startup message:", error)
          }
        }
      }

      // Credentials update
      if (events["creds.update"]) {
        await saveCreds()
      }

      // Messages
      if (events["messages.upsert"]) {
        const { messages } = events["messages.upsert"]

        for (const msg of messages) {
          if (!msg.message) continue

          // Save message to store
          saveMessage(msg)

          // Auto read messages (but not status messages)
          if (autoReadMSG && !msg.key.fromMe && !msg.key.remoteJid.endsWith("@status")) {
            try {
              await sock.readMessages([msg.key])
            } catch (error) {
              // Ignore read message errors
            }
          }

          // Auto read status messages
          if (autoReadSW && !msg.key.fromMe && msg.key.remoteJid.endsWith("@status")) {
            try {
              await sock.readMessages([msg.key])
            } catch (error) {
              // Ignore read message errors
            }
          }

          // Serialize and handle message
          try {
            const m = serialize(msg)
            if (m) {
              await message(m, global.plugins)
            }
          } catch (error) {
            log.error("Error processing message:", error)
          }
        }
      }

      // Message reactions
      if (events["messages.reaction"]) {
        const reactions = events["messages.reaction"]
        for (const reaction of reactions) {
          log.info("Reaction received:", reaction)
        }
      }

      // Group updates
      if (events["groups.update"]) {
        for (const update of events["groups.update"]) {
          try {
            const metadata = await sock.groupMetadata(update.id)
            updateGroupMetadata(metadata)
          } catch (error) {
            log.error("Error updating group metadata:", error)
          }
        }
      }

      // Participants update
      if (events["group-participants.update"]) {
        const { id, participants, action } = events["group-participants.update"]
        try {
          const metadata = await sock.groupMetadata(id)
          updateGroupMetadata(metadata)
          log.info(`Group ${id}: ${action} - ${participants.join(", ")}`)
        } catch (error) {
          log.error("Error handling participant update:", error)
        }
      }

      // Call handling - completely rewritten for safety
      if (events["call"]) {
        for (const call of events["call"]) {
          try {
            // Log basic call info safely
            global.log?.info(`📞 Call event received`)

            // Extract basic call properties safely
            const callInfo = {
              from: call?.from || "Unknown",
              isVideo: call?.isVideo || false,
              status: call?.status || "incoming",
              pushName: call?.pushName || null,
            }

            global.log?.info(`📞 Call info: ${safeStringify(callInfo)}`)

            // Extract caller details with defaults
            const callerJid = callInfo.from
            let callerNumber = "Unknown"
            let callerName = "Unknown Contact"

            if (callerJid && callerJid !== "Unknown") {
              try {
                if (callerJid.includes("@")) {
                  callerNumber = callerJid.split("@")[0]
                } else {
                  callerNumber = callerJid
                }

                // Clean the number
                callerNumber = callerNumber.replace(/[^\d]/g, "")

                if (callInfo.pushName) {
                  callerName = callInfo.pushName
                } else {
                  callerName = `Contact ${callerNumber}`
                }
              } catch (parseError) {
                global.log?.warn("Error parsing caller info:", parseError.message)
                callerNumber = "Unknown"
                callerName = "Unknown Contact"
              }
            }

            global.log?.info(`📞 Processed call from: ${callerName} (${callerNumber})`)

            // Send to Telegram if enabled
            if (config.telegram?.enabled && telegramBot) {
              try {
                const callData = {
                  name: callerName,
                  number: callerNumber,
                  isVideo: callInfo.isVideo === true,
                  status: callInfo.status,
                  timestamp: new Date(),
                }

                global.log?.info(`📞 Forwarding call to Telegram: ${callData.name} (${callData.number})`)

                await forwardCallToTelegram(callData)
                global.log?.info(`✅ Call details sent to Telegram successfully`)
              } catch (telegramError) {
                global.log?.error("Failed to send call to Telegram:", telegramError.message)
              }
            } else {
              global.log?.info("📞 Telegram not enabled, call logged only")
            }
          } catch (callError) {
            global.log?.error("Error processing call:", callError.message)

            // Try to send a basic call notification even if parsing failed
            if (config.telegram?.enabled && telegramBot) {
              try {
                const fallbackCallData = {
                  name: "Unknown Contact",
                  number: "Unknown",
                  isVideo: false,
                  status: "incoming",
                  timestamp: new Date(),
                }

                await forwardCallToTelegram(fallbackCallData)
                global.log?.info(`✅ Fallback call notification sent to Telegram`)
              } catch (fallbackError) {
                global.log?.error("Failed to send fallback call notification:", fallbackError.message)
              }
            }
          }
        }
      }
    })

    // Handle process messages (for controller.js)
    if (process.send) {
      process.on("message", async (msg) => {
        if (msg === "restart") {
          log.info("Restart signal received")
          process.exit(0)
        }
      })
    }

    isStarting = false
    return sock
  } catch (error) {
    log.error("Error starting bot:", error)
    isStarting = false
    setTimeout(() => startBot(), 5000)
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error)
})

process.on("unhandledRejection", (error) => {
  log.error("Unhandled Rejection:", error)
})

// Graceful shutdown
process.on("SIGINT", () => {
  log.info("Received SIGINT, shutting down gracefully...")
  if (global.bot && global.bot.end) {
    global.bot.end()
  }
  process.exit(0)
})

process.on("SIGTERM", () => {
  log.info("Received SIGTERM, shutting down gracefully...")
  if (global.bot && global.bot.end) {
    global.bot.end()
  }
  process.exit(0)
})

// Start the bot
startBot()
