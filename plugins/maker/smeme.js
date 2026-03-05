// plugins/Maker/smeme.js
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")
const axios = require("axios")
const path = require("path")
const fs = require("fs")

/* ================= FONT ================= */

const fontPath = path.join(
  process.cwd(),
  "lib",
  "Cobbler-SemiBold.ttf"
)

if (fs.existsSync(fontPath)) {
  GlobalFonts.registerFromPath(fontPath, "Cobbler")
}

/* ================= WRAP TEXT ================= */

function wrapText(ctx, text, maxWidth) {

  const words = text.split(" ")
  const lines = []
  let line = words[0]

  for (let i = 1; i < words.length; i++) {

    const test = line + " " + words[i]
    const width = ctx.measureText(test).width

    if (width < maxWidth) {
      line = test
    } else {
      lines.push(line)
      line = words[i]
    }

  }

  lines.push(line)

  return lines
}

/* ================= DRAW TEXT ================= */

function drawText(ctx, text, x, y, fill="white", stroke="black", lw=4) {

  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.lineJoin = "round"
  ctx.strokeText(text, x, y)

  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

/* ================= PLUGIN ================= */

module.exports = {
  name: "Simple Meme",
  desc: "Generate meme image",
  category: "Maker",
  method: "GET",
  path: "/smeme",

  params: [
    {
      name: "imageUrl",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL gambar"
    },
    {
      name: "topText",
      type: "query",
      required: false,
      dtype: "string"
    },
    {
      name: "bottomText",
      type: "query",
      required: false,
      dtype: "string"
    }
  ],

  example:
"/maker/smeme?imageUrl=https://files.catbox.moe/bqg31o.jpg&topText=atas&bottomText=bawah",

  async run(req, res) {

    try {

      const { imageUrl, topText="", bottomText="" } = req.query

      if (!imageUrl) {
        return res.status(400).json({
          status:false,
          message:"Parameter imageUrl wajib"
        })
      }

      /* ================= DOWNLOAD IMAGE ================= */

      const img = await axios.get(imageUrl,{
        responseType:"arraybuffer",
        timeout:30000,
        headers:{
          "User-Agent":"Mozilla/5.0"
        }
      })

      const buffer = Buffer.from(img.data)

      const image = await loadImage(buffer)

      /* ================= CANVAS ================= */

      const canvas = createCanvas(image.width,image.height)
      const ctx = canvas.getContext("2d")

      ctx.drawImage(image,0,0,image.width,image.height)

      const baseFont = Math.max(image.width * 0.15,32)

      const fontFamily =
        GlobalFonts.families.some(f => f.family === "Cobbler")
        ? "Cobbler"
        : "Arial"

      ctx.font = `bold ${baseFont}px ${fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "top"

      const margin = image.width * 0.05
      const maxWidth = image.width - margin*2

      /* ================= TOP TEXT ================= */

      if (topText) {

        const lines = wrapText(ctx, topText.toUpperCase(), maxWidth)
        const lineHeight = baseFont * 1.2

        lines.forEach((line,i)=>{
          drawText(
            ctx,
            line,
            image.width/2,
            margin + i*lineHeight,
            "white",
            "black",
            baseFont * 0.15
          )
        })
      }

      /* ================= BOTTOM TEXT ================= */

      if (bottomText) {

        const lines = wrapText(ctx, bottomText.toUpperCase(), maxWidth)
        const lineHeight = baseFont * 1.2

        const totalHeight = (lines.length-1)*lineHeight + baseFont
        const startY = image.height - margin - totalHeight

        lines.forEach((line,i)=>{
          drawText(
            ctx,
            line,
            image.width/2,
            startY + i*lineHeight,
            "white",
            "black",
            baseFont * 0.15
          )
        })
      }

      /* ================= OUTPUT ================= */

      const output = canvas.toBuffer("image/png")

      res.setHeader("Content-Type","image/png")
      res.send(output)

    } catch (err) {

      console.error("[SMEME]", err)

      res.status(500).json({
        status:false,
        message:"Gagal generate meme",
        error:err.message
      })

    }

  }
}