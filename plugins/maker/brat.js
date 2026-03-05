// plugins/Maker/brat.js
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas")
GlobalFonts.registerFromPath("lib/Cobbler-SemiBold.ttf", "Cobbler")

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

      const text = req.query.q

      const width = 1200
      const height = 1200

      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext("2d")

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)

      const startX = width * 0.07
      const startY = height * 0.07
      const maxWidth = width * 0.9
      const maxTextHeight = height * 0.86

      /* ================= AUTO FONT ================= */

      const startFont = Math.min(Math.max(width * 0.13, 40), 200)

      function getFontSize(ctx, text, maxWidth, maxHeight, startSize) {

        let fontSize = startSize

        while (fontSize > 20) {

          ctx.font = `bold ${fontSize}px Cobbler`
          const lineHeight = fontSize * 1.1

          const words = text.split(" ")
          let line = ""
          let lines = 1

          for (let i = 0; i < words.length; i++) {

            const testLine = line + words[i] + " "
            const w = ctx.measureText(testLine).width

            if (w > maxWidth && i > 0) {
              lines++
              line = words[i] + " "
            } else {
              line = testLine
            }

          }

          const totalHeight = lines * lineHeight

          if (totalHeight < maxHeight) return fontSize

          fontSize -= 4
        }

        return 20
      }

      const fontSize = getFontSize(ctx, text, maxWidth, maxTextHeight, startFont)

      ctx.font = `${fontSize}px Cobbler`
      ctx.fillStyle = "#000000"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"

      const lineHeight = fontSize * 1.1

      /* ================= WRAP TEXT ================= */

      function wrapText(ctx, text, x, y, maxWidth, lineHeight) {

        const words = text.split(" ")
        let line = ""
        let currentY = y

        for (let i = 0; i < words.length; i++) {

          const testLine = line + words[i] + " "
          const w = ctx.measureText(testLine).width

          if (w > maxWidth && i > 0) {

            ctx.fillText(line, x, currentY)
            line = words[i] + " "
            currentY += lineHeight

          } else {

            line = testLine

          }

        }

        ctx.fillText(line, x, currentY)
      }

      wrapText(ctx, text, startX, startY, maxWidth, lineHeight)

      const buffer = canvas.toBuffer("image/webp")

      res.setHeader("Content-Type", "image/webp")
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