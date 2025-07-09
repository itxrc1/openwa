const fs = require("fs")
const path = require("path")

// Create the session directory
const sessionDir = path.join(__dirname, "data", "session")
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true })
}

// Read the credentials from the uploaded file
const credsData = require("./creds.json")

// Write creds.json to session directory
fs.writeFileSync(path.join(sessionDir, "creds.json"), JSON.stringify(credsData, null, 2))

console.log("✅ Manual session created successfully!")
console.log("Session files created in:", sessionDir)
console.log("You can now start the bot with: npm start")

// Also create an empty keys directory structure that Baileys expects
const keysDir = path.join(sessionDir, "keys")
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true })
}

// Create empty app-state files that Baileys might expect
const appStateFiles = ["app-state-sync-version.json", "app-state-sync-key-undefined.json"]

appStateFiles.forEach((file) => {
  const filePath = path.join(sessionDir, file)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}")
  }
})

console.log("✅ Session structure prepared!")
