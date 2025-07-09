/*
 * This script runs the bot as a child process, automatically restarting
 * it if it crashes. It's a handy alternative to pm2 or nodemon for
 * environments where you can't install global dependencies, like on
 * non-root free VPS or Pterodactyl VMs.
 *
 * You can still run the bot normally without using this script.
 */

const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const args = ["index.js", ...process.argv.slice(2)]

let restart = false
let crashTimestamps = []
const MAX_CRASHES = 5
const TIME_WINDOW = 60000 // 60 seconds

function start() {
  console.log("🚀 Starting Open WABOT...")

  const bot = spawn(process.argv[0], args, {
    env: { ...process.env, IS_CHILD: true },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  })

  // Handle messages from the bot
  bot.on("message", async (msg) => {
    function handleRestart() {
      console.log("📤 Restart signal received. Stopping process...")
      restart = true
      bot.kill("SIGTERM") // Use SIGTERM for graceful shutdown
    }

    switch (msg) {
      case "restart":
        handleRestart()
        break
      case "unauthorized":
        console.log("🚨 Unauthorized signal received. Session expired.")
        console.log("🧹 Clearing session credentials...")

        try {
          // Clear session files
          const sessionDir = path.join(__dirname, "data", "session")
          const credsPath = path.join(sessionDir, "creds.json")

          if (fs.existsSync(credsPath)) {
            fs.unlinkSync(credsPath)
            console.log("✅ Credentials file removed")
          }

          // Remove app state files
          if (fs.existsSync(sessionDir)) {
            const files = fs.readdirSync(sessionDir)
            for (const file of files) {
              if (file.startsWith("app-state-sync-")) {
                fs.unlinkSync(path.join(sessionDir, file))
                console.log(`✅ Removed ${file}`)
              }
            }
          }

          console.log("✅ Session cleared. QR code will be shown on next start.")
        } catch (error) {
          console.error("❌ Error clearing credentials:", error.message)
        }

        handleRestart()
        break
    }
  })

  // Handle the process exit
  bot.on("close", (code) => {
    if (restart) {
      console.log("🔄 Process stopped. Restarting bot...")
      restart = false
      // Add a delay to prevent rapid restarts
      setTimeout(() => start(), 2000)
      return
    }

    console.log(`❌ Bot process exited with code ${code}.`)
    crashTimestamps.push(Date.now())

    // Remove timestamps older than TIME_WINDOW
    crashTimestamps = crashTimestamps.filter((timestamp) => Date.now() - timestamp < TIME_WINDOW)

    if (crashTimestamps.length >= MAX_CRASHES) {
      console.log(`💥 Bot crashed ${MAX_CRASHES} times in a short period. Stopping restarts.`)
      console.log("🔧 Please check the logs and fix any issues before restarting.")
      process.exit(1)
    } else {
      console.log(`⚠️ Bot has crashed ${crashTimestamps.length} times. Restarting bot...`)
      setTimeout(() => start(), 3000)
    }
  })

  // Handle controller shutdown
  process.on("SIGINT", () => {
    console.log("🛑 Controller received SIGINT, shutting down...")
    bot.kill("SIGTERM")
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    console.log("🛑 Controller received SIGTERM, shutting down...")
    bot.kill("SIGTERM")
    process.exit(0)
  })
}

start()
