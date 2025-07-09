const { getMessage, fetchGroupMetadata } = require("./store.js")
const { downloadMediaMessage } = require("@whiskeysockets/baileys")
const { generateID } = require("./util.js")
const emoji = require("emoji-regex")
const config = require("../config.js")

const recentId = {}
const userName = {}

function getMessageType(content) {
  if (!content) return ""
  return Object.keys(content).find((k) => !/^(senderKeyDistributionMessage|messageContextInfo)$/.test(k)) || ""
}

function parseMention(text) {
  if (typeof text === "string") {
    const matches = text.matchAll(/@([0-9]{5,16}|0)/g)
    if (matches !== null) {
      return [...matches].map((v) => v[1] + "@s.whatsapp.net") || []
    }
  }
  return []
}

/**
 * Serializes a message object to extract relevant details.
 */
function serialize(rmsg) {
  if (!rmsg.message || !rmsg.key || rmsg.status === 1) return
  if (recentId[rmsg.key.sender] === rmsg.key.id) return
  recentId[rmsg.key.sender] = rmsg.key.id

  const m = {
    id: rmsg.key.id,
    name: rmsg.key.fromMe ? global.bot.user?.name || "Bot" : rmsg.pushName,
    chat: global.bot.decodeJID(rmsg.key.remoteJid),
    sender: global.bot.decodeJID(rmsg.key.fromMe ? global.bot.user?.id : rmsg.key.participant || rmsg.key.remoteJid),
    fromMe: rmsg.key.fromMe,
    broadcast: rmsg.broadcast || rmsg.key.remoteJid.endsWith("@newsletter"),
    timestamp:
      rmsg.messageTimestamp?.low ||
      rmsg.messageTimestamp?.high ||
      rmsg.messageTimestamp ||
      Math.floor(Date.now() / 1000),
  }

  // Extract user number from sender for easier access
  m.sender.user = m.sender.split("@")[0]

  userName[m.sender.toString()] = m.name

  // Check if this is a status update
  m.isStatus = m.chat.endsWith("@status") || m.chat.includes("status@broadcast")

  m.isGroup = m.chat.includes("@g.us")
  if (m.isGroup) {
    m.group = fetchGroupMetadata(m.chat.toString())
    m.isGroupAdmin = m.group?.isAdmin(m.sender.toString()) || false
    m.isGroupSuperAdmin = m.group?.isSuperAdmin(m.sender.toString()) || false
    m.isBotAdmin = m.group?.isAdmin(global.bot.decodeJID(global.bot.user?.id).toString()) || false
  }

  const edited = rmsg.message.editedMessage?.message?.protocolMessage
  let msg = edited?.editedMessage || rmsg.message
  msg = msg.documentWithCaptionMessage?.message || msg
  m.type = getMessageType(msg)
  msg = m.type == "conversation" ? msg : msg[m.type]
  if (!msg) return

  m.body = msg.conversation || msg.text || msg.caption
  if (m.body) {
    m.prefix = config.prefixes.find((p) => m.body.startsWith(p))
    const body = m.body.slice(m.prefix?.length).trim()
    m.cmd = body.split(/[\s\n]+/)[0].toLowerCase()
    m.text = body.slice(m.cmd.length).trim()
    m.url =
      (body.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
      ) || [])[0] || ""
  }

  if (edited?.editedMessage) {
    rmsg.message = msg = getMessage(m.chat.toString(), edited.key.id).message || edited.editedMessage
    msg = msg[getMessageType(msg)]
  }

  m.mimetype = msg.mimetype || "text/plain"
  m.download = async function download() {
    return msg.mimetype || msg.thumbnailDirectPath
      ? await downloadMediaMessage(rmsg, "buffer", { reuploadRequest: global.bot.updateMediaMessage })
      : Buffer.from(m.body, "utf-8")
  }

  m.key = rmsg.key
  m.message = rmsg.message
  const ctx = msg.contextInfo
  if (ctx) {
    m.expiration = ctx.expiration || 0
    if (ctx.quotedMessage) {
      m.contextInfo = ctx
      m.quoted = {
        key: {
          id: ctx.stanzaId,
          remoteJid: ctx.remoteJid || m.chat.toString(),
          participant: ctx.participant,
        },
      }
      msg = getMessage(m.quoted.key.remoteJid, ctx.stanzaId)
      msg = msg.message ? msg.message : ctx.quotedMessage
      msg = { message: msg.documentWithCaptionMessage?.message || msg }
      m.quoted.pushName = msg.pushName || userName[ctx.participant]
      m.quoted.message = msg.message
      m.quoted.timestamp = msg.messageTimestamp || 0
      const type = getMessageType(msg.message)
      msg = msg.message[type]
      m.quoted.mimetype = msg.mimetype || "text/plain"
      m.quoted.text = typeof msg === "string" ? msg : msg.text || msg.caption || ""
      m.quoted.url =
        (m.quoted.text.match(
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
        ) || [])[0] || ""
      m.quoted.download = async function download() {
        return msg.mimetype || msg.thumbnailDirectPath
          ? await downloadMediaMessage(m.quoted, "buffer", { reuploadRequest: global.bot.updateMediaMessage })
          : Buffer.from(m.quoted.text, "utf-8")
      }
    }
  }

  let reacted = 0
  m.reply = async function reply(...contents) {
    let msg = {}
    let opt = {
      quoted: rmsg,
      getUrlInfo: false,
      ephemeralExpiration: m.expiration,
      messageId: generateID(24, "0SW8"),
    }
    let optc
    for (const content of contents) {
      switch (true) {
        case typeof content === "string":
          const emojies = content.match(emoji())
          if (msg.image || msg.video || msg.document) {
            if (msg.text) {
              msg.caption += " " + content
            } else {
              msg.caption = content
            }
          } else if (!msg.audio && !msg.sticker) {
            if (msg.text) {
              msg.text += " " + content
            } else if (
              (contents.length === 1 && emojies && emojies[0].length === content.length) ||
              (content === "" && reacted % 2 === 1)
            ) {
              if (content === "" && reacted % 2 === 1) reacted -= 1
              else reacted += 1
              msg.react = {
                text: content,
                key: m.key,
              }
              continue
            } else {
              if (!content) continue
              msg.text = content
            }
          }

          const mentions = parseMention(content)
          if (mentions) {
            msg.mentions = msg.mentions?.length > 0 ? msg.mentions.concat(mentions) : mentions
          }
          break

        case Buffer.isBuffer(content):
          const { fileTypeFromBuffer } = await import("file-type")
          let mime, ext
          try {
            ;({ mime, ext } = await fileTypeFromBuffer(content))
          } catch {
            ;[mime, ext] = ["text/plain", "txt"]
          }

          if (msg.text) {
            msg.caption = msg.text
            delete msg.text
          }

          if (mime === "image/webp") {
            delete msg.caption
            msg.sticker = content
          } else if (mime.startsWith("image")) {
            msg.image = content
          } else if (mime.startsWith("video")) {
            msg.video = content
          } else if (mime.startsWith("audio")) {
            msg.audio = content
            msg.mimetype = "audio/mpeg"
          } else {
            msg.mimetype = mime
            msg.document = content
            msg.fileName = `${generateID(12, "OWB_")}.${ext}`
          }
          break

        case typeof content === "object":
          if (!optc) {
            msg = Object.assign(msg, content)
            optc = true
          } else opt = Object.assign(opt, content)
          opt = Object.assign(opt, content)
          break

        default:
          throw new Error("unsupported typedata")
      }
    }

    let havemsg
    for (const key in msg) {
      if (msg[key]) havemsg = true
    }
    if (!havemsg) return
    return global.bot.sendMessage(m.chat.toString(), msg, opt)
  }
  return m
}

module.exports = { serialize }
