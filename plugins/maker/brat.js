// plugins/Maker/brat.js

const path = require("path")
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas")

GlobalFonts.registerFromPath(
  path.join(__dirname, "../../lib/Cobbler-SemiBold.ttf"),
  "Cobbler"
)

module.exports = {
  name: "Brat",
  desc: "Generate brat meme image",
  category: "Maker",
  method: "GET",
  path: "/brat",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Text brat",
    },
  ],

  example: "/maker/brat?q=halo dunia",

  async run(req, res) {
    try {

      const text = req.query.q?.trim()

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Text tidak boleh kosong"
        })
      }

      const width = 512
      const height = 512

      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext("2d")

      /* ================= BACKGROUND ================= */

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)

      /* ================= AREA ================= */

      const startX = width * 0.07
      const startY = height * 0.07

      const maxWidth = width * 0.86
      const maxTextHeight = height * 0.86

      /* ================= AUTO FONT ================= */

      const startFont = Math.min(
        Math.max(width * 0.13, 40),
        200
      )

      function splitLongWord(ctx, word, maxWidth) {

        const chars = word.split("")
        const result = []

        let current = ""

        for (const char of chars) {

          const test = current + char
          const w = ctx.measureText(test).width

          if (w > maxWidth && current.length > 0) {
            result.push(current)
            current = char
          } else {
            current = test
          }

        }

        if (current) result.push(current)

        return result
      }

      function buildLines(ctx, text, maxWidth) {

        const rawWords = text.split(/\s+/)
        const words = []

        for (const word of rawWords) {

          if (ctx.measureText(word).width > maxWidth) {
            words.push(...splitLongWord(ctx, word, maxWidth))
          } else {
            words.push(word)
          }

        }

        const lines = []
        let line = ""

        for (let i = 0; i < words.length; i++) {

          const testLine = line + words[i] + " "
          const w = ctx.measureText(testLine).width

          if (w > maxWidth && i > 0) {

            lines.push(line.trim())
            line = words[i] + " "

          } else {

            line = testLine

          }

        }

        if (line.trim()) {
          lines.push(line.trim())
        }

        return lines
      }

      function getFontSize(ctx, text, maxWidth, maxHeight, startSize) {

        let fontSize = startSize

        while (fontSize > 20) {

          ctx.font = `bold ${fontSize}px Cobbler`

          const lineHeight = fontSize * 1.1

          const lines = buildLines(ctx, text, maxWidth)

          const totalHeight = lines.length * lineHeight

          if (totalHeight <= maxHeight) {
            return fontSize
          }

          fontSize -= 4
        }

        return 20
      }

      const fontSize = getFontSize(
        ctx,
        text,
        maxWidth,
        maxTextHeight,
        startFont
      )

      const lineHeight = fontSize * 1.1

      /* ================= TEXT STYLE ================= */

      ctx.font = `bold ${fontSize}px Cobbler`
      ctx.fillStyle = "#000000"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"

      /* ================= WRAP TEXT ================= */

      const lines = buildLines(ctx, text, maxWidth)

      let currentY = startY

      for (const line of lines) {

        ctx.fillText(line, startX, currentY)

        currentY += lineHeight
      }

      /* ================= EXPORT ================= */

      let buffer
      let mime

      try {

        buffer = canvas.toBuffer("image/webp")
        mime = "image/webp"

      } catch {

        buffer = canvas.toBuffer("image/png")
        mime = "image/png"

      }

      res.setHeader("Content-Type", mime)
      res.send(buffer)

    } catch (err) {

      console.error("[Brat]", err)

      res.status(500).json({
        status: false,
        message: "Gagal generate brat",
        error: err.message
      })

    }
  }
}