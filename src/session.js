const pino = require("pino")
const path = require("path")
const { rmSync, existsSync, mkdirSync } = require("fs")
const pretty = require("pino-pretty")
const { isModuleInstalled } = require("./util.js")
const { debug, session } = require("../config.js")
const fs = require("fs")

let loadAuthState
mkdirSync(path.join(__dirname, "..", "data"), { recursive: true })

// Initialize logging with pino and pino-pretty
const log =
  global.log ||
  pino(
    pretty({
      colorize: true,
      minimumLevel: debug ? "trace" : "info",
      sync: true,
    }),
  )

// Check if 'baileys-mongodb' is installed and sessions.mongodb is configured
if (isModuleInstalled("baileys-mongodb") && session.type == "mongodb") {
  // Use MongoDB for session management
  loadAuthState = async function loadAuthState() {
    log.info("Using MongoDB session")
    const { useMongoAuthState } = require("baileys-mongodb")
    return await useMongoAuthState(session.url, {
      tableName: "open-wabot",
      session: "session",
    })
  }
} else if (isModuleInstalled("baileys-firebase") && existsSync("fireSession.json") && session.type == "firebase") {
  // Use Firebase for session management
  loadAuthState = async function loadAuthState() {
    log.info("Using firebase session")
    const { useFireAuthState } = require("baileys-firebase")
    return await useFireAuthState({
      tableName: "open-wabot",
      session: "session",
    })
  }
} else {
  // Use local file system for session management
  const sessionDir = path.join(__dirname, "..", "data", "session")
  loadAuthState = async function loadAuthState() {
    log.info("Using local session")
    const { useMultiFileAuthState } = require("@whiskeysockets/baileys")

    // Check if the session directory exists
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true })
    }

    const session = await useMultiFileAuthState(sessionDir)

    // Add removeCreds function to session to delete session directory
    session.removeCreds = async () => {
      log.info("Removing session credentials...")

      // Instead of removing the entire directory, just remove the creds.json file
      // This ensures we don't lose other session data but force a new login
      const credsPath = path.join(sessionDir, "creds.json")
      if (existsSync(credsPath)) {
        rmSync(credsPath, { force: true })
        log.info("Credentials removed, QR code will be shown on next start")
      }

      // Also remove app state files to ensure a clean session
      const files = fs.readdirSync(sessionDir)
      for (const file of files) {
        if (file.startsWith("app-state-sync-")) {
          rmSync(path.join(sessionDir, file), { force: true })
        }
      }
    }

    return session
  }
}

// If this file is run directly, remove the session credentials
if (require.main === module) {
  ;(async () => {
    try {
      const { removeCreds } = await loadAuthState()
      log.warn("Removing session")
      await removeCreds()
      log.info("Success")
    } catch (err) {
      log.error(err)
    }
  })()
}

module.exports = {
  loadAuthState,
}
