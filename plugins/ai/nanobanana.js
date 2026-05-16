const axios = require("axios")
const CryptoJS = require("crypto-js")

const aeskey = "ai-enhancer-web__aes-key"
const aesiv = "aienhancer-aesiv"

const headers = {
  "Content-Type": "application/json",
  Origin: "https://aienhancer.ai",
  Referer: "https://aienhancer.ai/ai-image-editor",
  "User-Agent": "Mozilla/5.0"
}

/* ================= AES ENCRYPT ================= */

function encrypt(obj) {
  return CryptoJS.AES.encrypt(
    JSON.stringify(obj),
    CryptoJS.enc.Utf8.parse(aeskey),
    {
      iv: CryptoJS.enc.Utf8.parse(aesiv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  ).toString()
}

/* ================= DOWNLOAD IMAGE ================= */

async function downloadImage(url) {

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxRedirects: 5,
    headers: { "User-Agent": "Mozilla/5.0" }
  })

  if (!res.data) throw new Error("Gagal download gambar")

  const buffer = Buffer.from(res.data)
  if (!buffer.length) throw new Error("Image kosong")

  const mime = res.headers["content-type"] || "image/jpeg"

  return { buffer, mime }
}

/* ================= NSFW CHECK ================= */

async function nsfwcheck(image) {

  const create = await axios.post(
    "https://aienhancer.ai/api/v1/r/nsfw-detection",
    { image },
    { headers, timeout: 20000 }
  )

  const id = create.data?.data?.id
  if (!id) throw new Error("NSFW task gagal dibuat")

  let attempts = 0

  while (attempts < 15) {

    await new Promise(r => setTimeout(r, 2000))

    const res = await axios.post(
      "https://aienhancer.ai/api/v1/r/nsfw-detection/result",
      { task_id: id },
      { headers, timeout: 20000 }
    )

    const data = res.data?.data

    if (data?.status === "succeeded") {
      console.log("NSFW result:", data.output)
      return data.output
    }

    attempts++
  }

  throw new Error("Timeout NSFW check")
}

/* ================= IMAGE EDIT ================= */

async function imageditor(imageBase64, prompt) {

  const settings = encrypt({
    prompt,
    size: "2K",
    aspect_ratio: "match_input_image",
    output_format: "jpeg",
    max_images: 1
  })

  const create = await axios.post(
    "https://aienhancer.ai/api/v1/k/image-enhance/create",
    {
      model: 1,
      image: [imageBase64],
      function: "ai-image-editor",
      settings
    },
    { headers, timeout: 20000 }
  )
  
  console.log("CREATE RESPONSE:", create.data)

  const id = create.data?.data?.id
  if (!id) throw new Error("Job gagal dibuat")

  let attempts = 0

  while (attempts < 25) {

    await new Promise(r => setTimeout(r, 2500))

    const res = await axios.post(
      "https://aienhancer.ai/api/v1/k/image-enhance/result",
      { task_id: id },
      { headers, timeout: 20000 }
    )

    const data = res.data?.data

    if (data?.status === "success") {
      return {
        id,
        output: data.output,
        input: data.input
      }
    }

    attempts++
  }

  throw new Error("Timeout menunggu hasil AI")
}

/* ================= MAIN PROCESS ================= */

async function nanobananaFromUrl(url, prompt) {

  if (!/^https?:\/\//i.test(url))
    throw new Error("URL tidak valid")

  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url))
    throw new Error("URL tidak diizinkan")

  const { buffer, mime } = await downloadImage(url)

  const base64 = buffer.toString("base64")
  const imageDataURI = `data:${mime};base64,${base64}`

  console.log("Image size:", buffer.length)
  console.log("Base64 length:", base64.length)

  const nsfw = await nsfwcheck(imageDataURI)

  if (nsfw && nsfw !== "normal")
    throw new Error("NSFW image blocked")

  return await imageditor(base64, prompt)
}

/* ================= API ROUTE ================= */

module.exports = {
  name: "NanoBanana",
  desc: "AI Image Edit via AIEnhancer",
  category: "AI",
  method: "GET",
  path: "/nanobanana",

  params: [
    {
      name: "url",
      type: "query",
      model: "text",
      required: true,
      desc: "url gambar"
    },
    {
      name: "prompt",
      type: "query",
      model: "text",
      required: true,
      desc: "prompt edit gambar"
    }
  ],

  example: "/ai/nanobanana?url=https://example.com/photo.jpg&prompt=buat+tersenyum",

  run: async (req, res) => {

    try {

      const { url, prompt } = req.query

      if (!url || !prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= dan ?prompt= wajib diisi"
        })
      }

      const result = await nanobananaFromUrl(url, prompt)

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          original: result.input,
          prompt,
          result: result.output
        },
        metadata: {
          model: "AIEnhancer v2",
          timestamp: new Date().toISOString()
        }
      })

    } catch (err) {

      if (err.response) {
        console.error("AIEnhancer error:", err.response.data)
      } else {
        console.error("NanoBanana error:", err.message)
      }

      res.status(500).json({
        status: false,
        creator: "Himejima",
        message: err.response?.data?.message || err.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}