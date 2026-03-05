// plugins/Maker/bratanime.js
const axios = require("axios")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")
GlobalFonts.registerFromPath("lib/Cobbler-SemiBold.ttf", "Cobbler")

module.exports = {
  name: "Brat Anime",
  desc: "Generate brat anime meme",
  category: "Maker",
  method: "GET",
  path: "/bratanime",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Text meme"
    }
  ],

  async run(req, res) {

    try {

      const text = req.query.q
      const img = await axios.get(
        "https://files.catbox.moe/bqg31o.jpg",
        {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        }
      )

      const bg = await loadImage(Buffer.from(img.data))

      const canvas = createCanvas(bg.width, bg.height)
      const ctx = canvas.getContext("2d")

      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)

      const boardX = canvas.width * 0.22;
      const boardY = canvas.height * 0.42;
      const boardWidth = canvas.width * 0.56;
      const boardHeight = canvas.height * 0.20;

      function wrapText(ctx, text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let line = "";

        for (let n = 0; n < words.length; n++) {
          const testLine = line ? line + " " + words[n] : words[n];
          const testWidth = ctx.measureText(testLine).width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n];
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        return lines;
      }

      function drawTextWithOutline(ctx, text, x, y, fillColor, strokeColor, strokeWidth) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
      }

      let fontSize = Math.floor(canvas.height * 0.20);
      ctx.font = `bold ${fontSize}px Cobbler`;

      let lines = wrapText(ctx, text, boardWidth * 0.9);
      let lineHeight = fontSize * 1.2;

      while (lines.length * lineHeight > boardHeight * 0.9 && fontSize > 14) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Cobbler`;
        lines = wrapText(ctx, text, boardWidth * 0.9);
        lineHeight = fontSize * 1.2;
      }

      const totalTextHeight = lines.length * lineHeight;
      const startY = boardY + (boardHeight - totalTextHeight) / 2 + fontSize / 2 + 60;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      lines.forEach((line, i) => {
        const y = startY + i * lineHeight;
        const x = boardX + boardWidth / 2;
        drawTextWithOutline(ctx, line, x, y, "#FFFFFF", "#000000", fontSize * 0.13);
      });

      /* ===== OUTPUT ===== */

      const buffer = canvas.toBuffer("image/webp")

      res.setHeader("Content-Type", "image/webp")
      res.send(buffer)

    } catch (err) {

      console.error("[BratAnime]", err)

      res.status(500).json({
        status: false,
        message: "Gagal generate brat anime",
        error: err.message
      })

    }

  }
}