const config = require("../config.js")
const fs = require("fs")
const path = require("path")

let db = null
let isConnected = false

// Initialize database connection
async function initDatabase() {
  if (!config.database.enabled) {
    global.log?.info("Database is disabled in config")
    return null
  }

  try {
    switch (config.database.type) {
      case "mongodb":
        return await initMongoDB()
      case "sqlite":
        return await initSQLite()
      case "local":
        return await initLocalDB()
      default:
        global.log?.error(`Unsupported database type: ${config.database.type}`)
        return null
    }
  } catch (error) {
    global.log?.error("Failed to initialize database:", error.message)
    return null
  }
}

// Initialize MongoDB
async function initMongoDB() {
  try {
    const { MongoClient } = require("mongodb")

    const client = new MongoClient(config.database.url)

    await client.connect()
    db = client.db(config.database.name)
    isConnected = true

    // Test connection
    await db.admin().ping()
    global.log?.info("✅ MongoDB connected successfully")

    // Create indexes for better performance
    await createMongoIndexes()

    return db
  } catch (error) {
    global.log?.error("MongoDB connection failed:", error.message)
    throw error
  }
}

// Initialize SQLite
async function initSQLite() {
  try {
    const sqlite3 = require("sqlite3").verbose()
    const dbPath = path.join(__dirname, "..", "data", "database.sqlite")

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    db = new sqlite3.Database(dbPath)
    isConnected = true

    global.log?.info("✅ SQLite connected successfully")

    // Create tables
    await createSQLiteTables()

    return db
  } catch (error) {
    global.log?.error("SQLite connection failed:", error.message)
    throw error
  }
}

// Initialize Local JSON database
async function initLocalDB() {
  try {
    const dataDir = path.join(__dirname, "..", "data", "local_db")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    db = {
      dataDir,
      collections: {},
    }

    // Initialize collections
    for (const [key, collection] of Object.entries(config.database.collections)) {
      const filePath = path.join(dataDir, `${collection}.json`)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]")
      }
      db.collections[key] = filePath
    }

    // Add special topics file
    const specialTopicsFile = path.join(dataDir, "special_topics.json")
    if (!fs.existsSync(specialTopicsFile)) {
      fs.writeFileSync(specialTopicsFile, "{}")
    }
    db.specialTopics = specialTopicsFile

    isConnected = true
    global.log?.info("✅ Local JSON database initialized")

    return db
  } catch (error) {
    global.log?.error("Local database initialization failed:", error.message)
    throw error
  }
}

// Create MongoDB indexes
async function createMongoIndexes() {
  try {
    // Users collection indexes
    await db.collection(config.database.collections.users).createIndex({ whatsapp_id: 1 }, { unique: true })
    await db.collection(config.database.collections.users).createIndex({ created_at: -1 })

    // Groups collection indexes
    await db.collection(config.database.collections.groups).createIndex({ group_id: 1 }, { unique: true })

    // Messages collection indexes
    await db.collection(config.database.collections.messages).createIndex({ message_id: 1 })
    await db.collection(config.database.collections.messages).createIndex({ sender: 1 })
    await db.collection(config.database.collections.messages).createIndex({ timestamp: -1 })

    // Telegram topics collection indexes
    await db
      .collection(config.database.collections.telegram_topics)
      .createIndex({ whatsapp_number: 1 }, { unique: true })
    await db.collection(config.database.collections.telegram_topics).createIndex({ topic_id: 1 }, { unique: true })

    // Profile pictures collection indexes
    await db.collection(config.database.collections.profile_pictures).createIndex({ whatsapp_id: 1 }, { unique: true })
    await db.collection(config.database.collections.profile_pictures).createIndex({ updated_at: -1 })

    global.log?.info("✅ MongoDB indexes created")
  } catch (error) {
    global.log?.error("Error creating MongoDB indexes:", error.message)
  }
}

// Create SQLite tables
async function createSQLiteTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_id TEXT UNIQUE NOT NULL,
        name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT UNIQUE NOT NULL,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        chat TEXT NOT NULL,
        content TEXT,
        message_type TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS telegram_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_number TEXT UNIQUE NOT NULL,
        topic_id INTEGER NOT NULL,
        contact_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS special_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_type TEXT UNIQUE NOT NULL,
        topic_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS profile_pictures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_id TEXT UNIQUE NOT NULL,
        profile_url TEXT,
        url_hash TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ]

    let completed = 0
    queries.forEach((query) => {
      db.run(query, (err) => {
        if (err) {
          reject(err)
          return
        }
        completed++
        if (completed === queries.length) {
          global.log?.info("✅ SQLite tables created")
          resolve()
        }
      })
    })
  })
}

// Generic database operations
const DatabaseOps = {
  // Save user
  async saveUser(userData) {
    if (!isConnected) return null

    try {
      switch (config.database.type) {
        case "mongodb":
          return await db
            .collection(config.database.collections.users)
            .updateOne(
              { whatsapp_id: userData.whatsapp_id },
              { $set: { ...userData, updated_at: new Date() } },
              { upsert: true },
            )

        case "sqlite":
          return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO users (whatsapp_id, name, phone, updated_at) 
              VALUES (?, ?, ?, datetime('now'))
            `)
            stmt.run([userData.whatsapp_id, userData.name, userData.phone], function (err) {
              if (err) reject(err)
              else resolve({ insertedId: this.lastID })
            })
            stmt.finalize()
          })

        case "local":
          const usersFile = db.collections.users
          const users = JSON.parse(fs.readFileSync(usersFile, "utf8"))
          const existingIndex = users.findIndex((u) => u.whatsapp_id === userData.whatsapp_id)

          if (existingIndex >= 0) {
            users[existingIndex] = { ...users[existingIndex], ...userData, updated_at: new Date() }
          } else {
            users.push({ ...userData, id: Date.now(), created_at: new Date() })
          }

          fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
          return { acknowledged: true }
      }
    } catch (error) {
      global.log?.error("Error saving user:", error.message)
      return null
    }
  },

  // Save profile picture info
  async saveProfilePicture(whatsappId, profileUrl, urlHash) {
    if (!isConnected) return null

    try {
      const profileData = {
        whatsapp_id: whatsappId,
        profile_url: profileUrl,
        url_hash: urlHash,
        updated_at: new Date(),
      }

      switch (config.database.type) {
        case "mongodb":
          return await db
            .collection(config.database.collections.profile_pictures)
            .updateOne({ whatsapp_id: whatsappId }, { $set: profileData }, { upsert: true })

        case "sqlite":
          return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO profile_pictures (whatsapp_id, profile_url, url_hash, updated_at) 
              VALUES (?, ?, ?, datetime('now'))
            `)
            stmt.run([whatsappId, profileUrl, urlHash], function (err) {
              if (err) reject(err)
              else resolve({ insertedId: this.lastID })
            })
            stmt.finalize()
          })

        case "local":
          const profilesFile = db.collections.profile_pictures
          let profiles = []
          if (fs.existsSync(profilesFile)) {
            profiles = JSON.parse(fs.readFileSync(profilesFile, "utf8"))
          }

          const existingIndex = profiles.findIndex((p) => p.whatsapp_id === whatsappId)
          if (existingIndex >= 0) {
            profiles[existingIndex] = profileData
          } else {
            profiles.push({ ...profileData, id: Date.now() })
          }

          fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2))
          return { acknowledged: true }
      }
    } catch (error) {
      global.log?.error("Error saving profile picture:", error.message)
      return null
    }
  },

  // Get profile picture info
  async getProfilePicture(whatsappId) {
    if (!isConnected) return null

    try {
      switch (config.database.type) {
        case "mongodb":
          return await db.collection(config.database.collections.profile_pictures).findOne({ whatsapp_id: whatsappId })

        case "sqlite":
          return new Promise((resolve, reject) => {
            db.get("SELECT * FROM profile_pictures WHERE whatsapp_id = ?", [whatsappId], (err, row) => {
              if (err) reject(err)
              else resolve(row || null)
            })
          })

        case "local":
          const profilesFile = db.collections.profile_pictures
          if (!fs.existsSync(profilesFile)) return null

          const profiles = JSON.parse(fs.readFileSync(profilesFile, "utf8"))
          return profiles.find((p) => p.whatsapp_id === whatsappId) || null
      }
    } catch (error) {
      global.log?.error("Error getting profile picture:", error.message)
      return null
    }
  },

  // Save special topic (status, call)
  async saveSpecialTopic(topicType, topicId) {
    if (!isConnected) return null

    try {
      switch (config.database.type) {
        case "mongodb":
          return await db
            .collection("special_topics")
            .updateOne(
              { topic_type: topicType },
              { $set: { topic_type: topicType, topic_id: topicId, created_at: new Date() } },
              { upsert: true },
            )

        case "sqlite":
          return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO special_topics (topic_type, topic_id) 
              VALUES (?, ?)
            `)
            stmt.run([topicType, topicId], function (err) {
              if (err) reject(err)
              else resolve({ insertedId: this.lastID })
            })
            stmt.finalize()
          })

        case "local":
          const specialTopicsFile = db.specialTopics
          let specialTopics = {}
          if (fs.existsSync(specialTopicsFile)) {
            specialTopics = JSON.parse(fs.readFileSync(specialTopicsFile, "utf8"))
          }

          specialTopics[topicType] = topicId
          fs.writeFileSync(specialTopicsFile, JSON.stringify(specialTopics, null, 2))
          return { acknowledged: true }
      }
    } catch (error) {
      global.log?.error("Error saving special topic:", error.message)
      return null
    }
  },

  // Save Telegram topic mapping
  async saveTelegramTopic(whatsappNumber, topicId, contactName) {
    if (!isConnected) return null

    try {
      const topicData = {
        whatsapp_number: whatsappNumber,
        topic_id: topicId,
        contact_name: contactName,
        created_at: new Date(),
      }

      switch (config.database.type) {
        case "mongodb":
          return await db
            .collection(config.database.collections.telegram_topics)
            .updateOne({ whatsapp_number: whatsappNumber }, { $set: topicData }, { upsert: true })

        case "sqlite":
          return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO telegram_topics (whatsapp_number, topic_id, contact_name) 
              VALUES (?, ?, ?)
            `)
            stmt.run([whatsappNumber, topicId, contactName], function (err) {
              if (err) reject(err)
              else resolve({ insertedId: this.lastID })
            })
            stmt.finalize()
          })

        case "local":
          const topicsFile = db.collections.telegram_topics
          let topics = []
          if (fs.existsSync(topicsFile)) {
            topics = JSON.parse(fs.readFileSync(topicsFile, "utf8"))
          }

          const existingIndex = topics.findIndex((t) => t.whatsapp_number === whatsappNumber)
          if (existingIndex >= 0) {
            topics[existingIndex] = topicData
          } else {
            topics.push({ ...topicData, id: Date.now() })
          }

          fs.writeFileSync(topicsFile, JSON.stringify(topics, null, 2))
          return { acknowledged: true }
      }
    } catch (error) {
      global.log?.error("Error saving Telegram topic:", error.message)
      return null
    }
  },

  // Get Telegram topic mappings
  async getTelegramTopics() {
    if (!isConnected) return {}

    try {
      let statusTopicId = null
      let callTopicId = null

      switch (config.database.type) {
        case "mongodb":
          const mongoTopics = await db.collection(config.database.collections.telegram_topics).find({}).toArray()
          const mongoMapping = {}
          const mongoReverse = {}

          mongoTopics.forEach((topic) => {
            mongoMapping[topic.whatsapp_number] = topic.topic_id
            mongoReverse[topic.topic_id] = topic.whatsapp_number
          })

          // Get special topics
          const specialTopics = await db.collection("special_topics").find({}).toArray()
          specialTopics.forEach((topic) => {
            if (topic.topic_type === "status") statusTopicId = topic.topic_id
            if (topic.topic_type === "call") callTopicId = topic.topic_id
          })

          return {
            topicMapping: mongoMapping,
            reverseTopicMapping: mongoReverse,
            statusTopicId,
            callTopicId,
          }

        case "sqlite":
          return new Promise((resolve, reject) => {
            db.all("SELECT * FROM telegram_topics", (err, rows) => {
              if (err) {
                reject(err)
                return
              }

              const mapping = {}
              const reverse = {}

              rows.forEach((row) => {
                mapping[row.whatsapp_number] = row.topic_id
                reverse[row.topic_id] = row.whatsapp_number
              })

              // Get special topics
              db.all("SELECT * FROM special_topics", (err, specialRows) => {
                if (!err && specialRows) {
                  specialRows.forEach((row) => {
                    if (row.topic_type === "status") statusTopicId = row.topic_id
                    if (row.topic_type === "call") callTopicId = row.topic_id
                  })
                }

                resolve({
                  topicMapping: mapping,
                  reverseTopicMapping: reverse,
                  statusTopicId,
                  callTopicId,
                })
              })
            })
          })

        case "local":
          const topicsFile = db.collections.telegram_topics
          const specialTopicsFile = db.specialTopics

          let topics = []
          if (fs.existsSync(topicsFile)) {
            topics = JSON.parse(fs.readFileSync(topicsFile, "utf8"))
          }

          const localSpecialTopics = {}
          if (fs.existsSync(specialTopicsFile)) {
            Object.assign(localSpecialTopics, JSON.parse(fs.readFileSync(specialTopicsFile, "utf8")))
          }

          const mapping = {}
          const reverse = {}

          topics.forEach((topic) => {
            mapping[topic.whatsapp_number] = topic.topic_id
            reverse[topic.topic_id] = topic.whatsapp_number
          })

          return {
            topicMapping: mapping,
            reverseTopicMapping: reverse,
            statusTopicId: localSpecialTopics.status || null,
            callTopicId: localSpecialTopics.call || null,
          }
      }
    } catch (error) {
      global.log?.error("Error getting Telegram topics:", error.message)
      return { topicMapping: {}, reverseTopicMapping: {}, statusTopicId: null, callTopicId: null }
    }
  },

  // Save message
  async saveMessage(messageData) {
    if (!isConnected) return null

    try {
      switch (config.database.type) {
        case "mongodb":
          return await db.collection(config.database.collections.messages).insertOne({
            ...messageData,
            timestamp: new Date(),
          })

        case "sqlite":
          return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
              INSERT INTO messages (message_id, sender, chat, content, message_type) 
              VALUES (?, ?, ?, ?, ?)
            `)
            stmt.run(
              [
                messageData.message_id,
                messageData.sender,
                messageData.chat,
                messageData.content,
                messageData.message_type,
              ],
              function (err) {
                if (err) reject(err)
                else resolve({ insertedId: this.lastID })
              },
            )
            stmt.finalize()
          })

        case "local":
          const messagesFile = db.collections.messages
          let messages = []
          if (fs.existsSync(messagesFile)) {
            messages = JSON.parse(fs.readFileSync(messagesFile, "utf8"))
          }

          messages.push({ ...messageData, id: Date.now(), timestamp: new Date() })

          // Keep only last 1000 messages to prevent file from getting too large
          if (messages.length > 1000) {
            messages = messages.slice(-1000)
          }

          fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2))
          return { acknowledged: true }
      }
    } catch (error) {
      global.log?.error("Error saving message:", error.message)
      return null
    }
  },

  // Get database stats
  async getStats() {
    if (!isConnected) return null

    try {
      switch (config.database.type) {
        case "mongodb":
          const stats = await db.stats()
          const collections = {}

          for (const [key, collectionName] of Object.entries(config.database.collections)) {
            collections[key] = await db.collection(collectionName).countDocuments()
          }

          return {
            type: "MongoDB",
            connected: true,
            database: config.database.name,
            collections,
            size: stats.dataSize,
            indexes: stats.indexes,
          }

        case "sqlite":
          return new Promise((resolve, reject) => {
            const sqliteStats = { type: "SQLite", connected: true, tables: {} }

            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
              if (!err) sqliteStats.tables.users = row.count

              db.get("SELECT COUNT(*) as count FROM messages", (err, row) => {
                if (!err) sqliteStats.tables.messages = row.count

                db.get("SELECT COUNT(*) as count FROM telegram_topics", (err, row) => {
                  if (!err) sqliteStats.tables.telegram_topics = row.count

                  db.get("SELECT COUNT(*) as count FROM profile_pictures", (err, row) => {
                    if (!err) sqliteStats.tables.profile_pictures = row.count
                    resolve(sqliteStats)
                  })
                })
              })
            })
          })

        case "local":
          const localStats = { type: "Local JSON", connected: true, files: {} }

          for (const [key, filePath] of Object.entries(db.collections)) {
            if (fs.existsSync(filePath)) {
              const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
              localStats.files[key] = Array.isArray(data) ? data.length : 0
            } else {
              localStats.files[key] = 0
            }
          }

          return localStats
      }
    } catch (error) {
      global.log?.error("Error getting database stats:", error.message)
      return null
    }
  },
}

module.exports = {
  initDatabase,
  DatabaseOps,
  isConnected: () => isConnected,
  getDatabase: () => db,
}
