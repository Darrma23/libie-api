// plugins/Maker/bratvideo.js
const { createCanvas } = require("@napi-rs/canvas")
const ffmpeg = require("fluent-ffmpeg")
const fs = require("fs")
const path = require("path")
const os = require("os")

module.exports = {
  name: "Brat Video",
  desc: "Generate brat video kata muncul satu-satu",
  category: "Maker",
  method: "GET",
  path: "/bratvideo",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Text brat video",
    },
  ],

  example: "/maker/bratvideo?q=halo dunia",

  async run(req, res) {

    try {

      const text = req.query.q
      const words = text.split(" ")

      const width = 720
      const height = 720

      const startX = 40
      const startY = 40
      const maxWidth = width * 0.9
      const maxHeight = height - 80

      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "brat-"))

      // fungsi wrap text
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

      // fungsi cari font size yang muat
      function getFontSize(ctx, text, maxWidth, maxHeight, startSize) {

        let size = startSize

        while (size > 20) {

          ctx.font = `bold ${size}px Sans`
          const lineHeight = size * 1.2

          const words = text.split(" ")
          let line = ""
          let lines = 1

          for (let i = 0; i < words.length; i++) {

            const test = line + words[i] + " "
            const w = ctx.measureText(test).width

            if (w > maxWidth && i > 0) {
              lines++
              line = words[i] + " "
            } else {
              line = test
            }

          }

          const totalHeight = lines * lineHeight

          if (totalHeight <= maxHeight) return size

          size -= 4
        }

        return 20
      }

      // cari font size terbaik
      const testCanvas = createCanvas(width, height)
      const testCtx = testCanvas.getContext("2d")

      const fontSize = getFontSize(
        testCtx,
        text,
        maxWidth,
        maxHeight,
        100
      )

      const lineHeight = fontSize * 1.2

      // generate frame
      for (let i = 0; i < words.length; i++) {

        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext("2d")

        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)

        ctx.font = `bold ${fontSize}px Sans`
        ctx.fillStyle = "#000000"
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        const currentText = words.slice(0, i + 1).join(" ")

        wrapText(ctx, currentText, startX, startY, maxWidth, lineHeight)

        const frame = path.join(tmp, `frame${i}.png`)
        fs.writeFileSync(frame, canvas.toBuffer("image/png"))
      }

      const output = path.join(tmp, "video.webp")

      await new Promise((resolve, reject) => {

        ffmpeg()
          .input(path.join(tmp, "frame%d.png"))
          .inputFPS(2)
          .outputOptions([
            "-vcodec libwebp",
            "-loop 0",
            "-lossless 1",
            "-preset default",
            "-an",
            "-vsync 0"
          ])
          .output(output)
          .on("end", resolve)
          .on("error", reject)
          .run()

      })

      const video = fs.readFileSync(output)

      res.setHeader("Content-Type", "image/webp")
      res.send(video)

    } catch (err) {

      console.error("[BratVideo]", err)

      res.status(500).json({
        status: false,
        message: "Gagal generate brat video",
        error: err.message
      })

    }

  }
}