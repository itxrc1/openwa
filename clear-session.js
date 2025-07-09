const fs = require("fs")
const path = require("path")

console.log("🧹 Clearing WhatsApp session...")

const sessionDir = path.join(__dirname, "data", "session")

if (!fs.existsSync(sessionDir)) {
  console.log("❌ Session directory doesn't exist")
  process.exit(1)
}

try {
  // Remove credentials file
  const credsPath = path.join(sessionDir, "creds.json")
  if (fs.existsSync(credsPath)) {
    fs.unlinkSync(credsPath)
    console.log("✅ Removed creds.json")
  }

  // Remove app state files
  const files = fs.readdirSync(sessionDir)
  let removedCount = 0

  for (const file of files) {
    if (file.startsWith("app-state-sync-")) {
      fs.unlinkSync(path.join(sessionDir, file))
      removedCount++
    }
  }

  console.log(`✅ Removed ${removedCount} app state files`)
  console.log("🎉 Session cleared successfully!")
  console.log("📱 Next time you start the bot, it will show a QR code to scan")
} catch (error) {
  console.error("❌ Error clearing session:", error.message)
  process.exit(1)
}
