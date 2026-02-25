const axios = require('axios')
const FormData = require('form-data')

const VALID_SCALES = ['2', '4']
const BASE = 'https://api29g.iloveimg.com'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

let cookieStore = {}

function extractCookies(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie) return

  setCookie.forEach(c => {
    const part = c.split(';')[0]
    const [key, value] = part.split('=')
    cookieStore[key] = value
  })
}

function getCookies() {
  return Object.entries(cookieStore)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

async function getToken() {
  const res = await axios.get('https://www.iloveimg.com/upscale-image', {
    headers: { 'User-Agent': UA }
  })

  extractCookies(res)

  const html = res.data

  const token = html.match(/"token":"(eyJ[^"]+)"/)?.[1]
  const task = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1]

  if (!token || !task)
    throw new Error('Gagal ambil token iloveimg')

  return { token, task }
}

async function uploadImage(imageUrl, token, task) {
  const image = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000
  })

  const buffer = Buffer.from(image.data)

  if (!buffer || buffer.length < 1000)
    throw new Error('File kosong / rusak')

  const form = new FormData()
  form.append('name', 'upload.jpg')
  form.append('chunk', '0')
  form.append('chunks', '1')
  form.append('task', task)
  form.append('preview', '1')
  form.append('v', 'web.0')
  form.append('file', buffer, 'image.jpg')

  const res = await axios.post(`${BASE}/v1/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
      'User-Agent': UA,
      Origin: 'https://www.iloveimg.com',
      Referer: 'https://www.iloveimg.com/'
    }
  })

  if (!res.data?.server_filename)
    throw new Error('Upload gagal')

  return res.data.server_filename
}

async function doUpscale(serverFilename, token, task, scale) {
  if (!VALID_SCALES.includes(String(scale)))
    throw new Error("Scale harus 2 atau 4")

  const form = new FormData()
  form.append('task', task)
  form.append('server_filename', serverFilename)
  form.append('scale', scale)

  const res = await axios.post(`${BASE}/v1/upscale`, form, {
    responseType: 'arraybuffer',
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
      'User-Agent': UA,
      Origin: 'https://www.iloveimg.com',
      Referer: 'https://www.iloveimg.com/'
    }
  })

  return Buffer.from(res.data)
}

async function upscale(imageUrl, scale) {
  cookieStore = {}

  const { token, task } = await getToken()
  const serverFilename = await uploadImage(imageUrl, token, task)
  return await doUpscale(serverFilename, token, task, scale)
}

module.exports = {
  name: "Upscale Image",
  desc: "Perbesar resolusi gambar (2x / 4x)",
  category: "Tools",
  method: "GET",
  path: "/upscale",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL gambar publik (jpg/png/webp)"
    },
    {
      name: "scale",
      type: "query",
      required: false,
      dtype: "string",
      desc: "Skala upscale: 2 atau 4 (default: 2)"
    }
  ],

  example: "/tools/upscale?url=https://example.com/image.jpg&scale=4",

  run: async (req, res) => {
    try {
      const { url, scale } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter url wajib diisi"
        })
      }

      const buffer = await upscale(url, scale || '2')

      if (!buffer || buffer.length < 1000) {
        throw new Error('Upscale gagal / buffer kosong')
      }

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      })

      res.end(buffer)

    } catch (err) {
      console.error("UPSCALE ERROR:", err.message)

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}