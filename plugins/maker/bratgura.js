// plugins/Maker/bratgura.js
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")
GlobalFonts.registerFromPath("lib/Cobbler-SemiBold.ttf", "Cobbler")


module.exports = {
    name: "Brat Gura",
    desc: "Generate bratgura meme image",
    category: "Maker",
    method: "GET",
    path: "/bratgura",

    params: [
        {
            name: "q",
            type: "query",
            required: true,
            dtype: "string",
            desc: "Text bratgura",
        },
    ],

    async run(req, res) {
        try {
            const text = req.query.q

            const bg = await loadImage(
                "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772640343006.jpeg"
            )

            const canvas = createCanvas(bg.width, bg.height)
            const ctx = canvas.getContext("2d")

            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)

            ctx.fillStyle = "#000000"
            ctx.lineWidth = 1
            ctx.font = "230px Cobbler"
            ctx.textAlign = "left"
            ctx.lineJoin = "round"

            const startX = canvas.width * 0.55
            const startY = canvas.height * 0.30
            const maxWidth = canvas.width * 0.40
            const lineHeight = 205

            function drawWrapText(ctx, text, x, y, maxWidth, lineHeight) {
                const words = text.split(" ")
                let line = ""
                let currentY = y

                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + " "
                    const metrics = ctx.measureText(testLine)
                    const testWidth = metrics.width

                    if (testWidth > maxWidth && i > 0) {
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

            drawWrapText(ctx, text, startX, startY, maxWidth, lineHeight)

            const buffer = canvas.toBuffer("image/png")

            res.setHeader("Content-Type", "image/png")
            res.status(200).send(buffer)

        } catch (err) {
            console.error("[Plugin BratGura]", err.message)

            res.status(500).json({
                status: false,
                message: "Gagal generate bratgura",
                error: err.message,
            })
        }
    }
}