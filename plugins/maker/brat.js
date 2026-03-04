// plugins/Maker/brat.js
const { createCanvas } = require("@napi-rs/canvas")

module.exports = {
  name: "Brat",
  desc: "Generate brat text meme",
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

  async run(req, res) {
    try {
      const text = req.query.q

      const width = 1200
      const height = 1200

      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext("2d")

      // background putih
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)

      const fontSize = 160

      ctx.font = `bold ${fontSize}px Sans`
      ctx.textAlign = "left"
      ctx.textBaseline = "top"

      ctx.fillStyle = "#000000"
      ctx.lineWidth = 1
      ctx.lineJoin = "round"

      const lineHeight = fontSize * 1.2
      const maxWidth = width * 0.9

      const startX = 80
      const startY = 80

      function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ")
        let line = ""
        let currentY = y

        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " "
          const w = ctx.measureText(testLine).width

          if (w > maxWidth && i > 0) {
            ctx.strokeText(line, x, currentY)
            ctx.fillText(line, x, currentY)

            line = words[i] + " "
            currentY += lineHeight
          } else {
            line = testLine
          }
        }

        ctx.strokeText(line, x, currentY)
        ctx.fillText(line, x, currentY)
      }

      wrapText(ctx, text, startX, startY, maxWidth, lineHeight)

      const buffer = canvas.toBuffer("image/png")

      res.setHeader("Content-Type", "image/png")
      res.status(200).send(buffer)

    } catch (err) {
      console.error("[Plugin Brat]", err.message)

      res.status(500).json({
        status: false,
        message: "Gagal generate brat",
        error: err.message,
      })
    }
  }
}