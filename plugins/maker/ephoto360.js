const axios = require('axios')
const qs = require('qs')
const cheerio = require('cheerio')

/* ================= MODELS ================= */

const MODELS = {
  pornhub: {
    url: 'https://en.ephoto360.com/create-pornhub-style-logos-online-free-549.html',
    text: 2
  },
  neon: {
    url: 'https://en.ephoto360.com/create-neon-light-text-effect-online-882.html',
    text: 1
  },
  blackpink: {
    url: 'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html',
    text: 1
  },
  deadpool: {
    url: 'https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html',
    text: 1
  },
  glitch: {
     url: 'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
     text: 1
  },
  glases: {
     url: 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
     text: 1
  },
  comic: {
     url: 'https://en.ephoto360.com/create-online-3d-comic-style-text-effects-817.html',
     text: 1
  },
  dragonball: {
     url: 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
     text: 1
  },
  naruto: {
     url: 'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
     text: 1
  },
  typography: {
     url: 'https://en.ephoto360.com/create-online-typography-art-effects-with-multiple-layers-811.html',
     text: 1
  },
  thor: {
     url: 'https://en.ephoto360.com/create-thor-logo-style-text-effects-online-for-free-796.html',
     text: 2
  },
  grafity: {
     url: 'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html',
     text: 1
  },
  grafity2: {
     url: 'https://en.ephoto360.com/cute-girl-painting-graffiti-text-effect-667.html',
     text: 2
  }
}

/* ================= CONFIG ================= */

const CONFIG = {
  BASE_URL: 'https://en.ephoto360.com',
  API_CREATE: 'https://en.ephoto360.com/effect/create-image',
  HEADERS: {
    NAVIGATE: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    },
    AJAX: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
}

/* ================= CORE ================= */

function updateCookies(oldCookie, newCookiesHeader) {
  if (!newCookiesHeader) return oldCookie
  const newCookieStr = newCookiesHeader.map(c => c.split(';')[0]).join('; ')
  return oldCookie ? `${oldCookie}; ${newCookieStr}` : newCookieStr
}

async function getSession(url, textArray) {

  const resInit = await axios.get(url, { headers: CONFIG.HEADERS.NAVIGATE })
  let cookies = updateCookies('', resInit.headers['set-cookie'])

  const $ = cheerio.load(resInit.data)

  const token = $('input[name="token"]').val()
  const buildServer = $('input[name="build_server"]').val()
  const buildServerId = $('input[name="build_server_id"]').val()

  if (!token) throw new Error('Token tidak ditemukan (kemungkinan kena rate limit)')

  const formData = {
    text: textArray,
    submit: 'GO',
    token,
    build_server: buildServer,
    build_server_id: buildServerId
  }

  const resMeta = await axios.post(url, qs.stringify(formData, { arrayFormat: 'brackets' }), {
    headers: {
      ...CONFIG.HEADERS.NAVIGATE,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': url,
      'Cookie': cookies
    }
  })

  cookies = updateCookies(cookies, resMeta.headers['set-cookie'])

  const $meta = cheerio.load(resMeta.data)
  const rawJson = $meta('#form_value_input').val()

  if (!rawJson) throw new Error('Gagal generate session')

  return {
    ...JSON.parse(rawJson),
    cookies,
    referer: url
  }
}

async function create(effectUrl, texts) {

  const session = await getSession(effectUrl, texts)

  const payload = {
    ...session,
    autocomplete: '',
    text: texts
  }

  const res = await axios.post(CONFIG.API_CREATE, qs.stringify(payload, { arrayFormat: 'brackets' }), {
    headers: {
      ...CONFIG.HEADERS.AJAX,
      'Referer': session.referer,
      'Origin': CONFIG.BASE_URL,
      'Cookie': session.cookies
    }
  })

  const data = res.data

  if (!data.success) {
    return {
      status: false,
      message: 'Gagal generate gambar'
    }
  }

  return {
    status: true,
    image_url: session.build_server + data.image
  }
}

/* ================= PLUGIN ================= */

module.exports = {
  name: "Ephoto360 Generator",
  desc: "Generate text effect (multi model)",
  method: "GET",
  path: "ephoto360",

  params: [
    {
      name: "q",
      type: "query",
      model: "text",
      required:true,
      desc: "Teks (pisahkan dengan | untuk multi text)"
    },
    {
      name: "model",
      type: "query",
      model: "select",
      required:true,
      options: Object.keys(MODELS),
      default: "pornhub",
      desc: "Model effect"
    }
  ],

  run: async (req, res) => {

    try {

      let { q, model } = req.query

      if (!q) {
        return res.json({
          status: false,
          message: "Parameter q wajib"
        })
      }

      model = model || "pornhub"

      if (!MODELS[model]) {
        return res.json({
          status: false,
          message: "Model tidak valid",
          available_models: Object.keys(MODELS)
        })
      }

      const config = MODELS[model]

      const texts = q.split('|')

      if (texts.length < config.text) {
        return res.json({
          status: false,
          message: `Model ${model} butuh ${config.text} teks`
        })
      }

      const result = await create(config.url, texts)

      res.json({
        ...result,
        model,
        input: texts
      })

    } catch (err) {

      res.json({
        status: false,
        message: err.message
      })

    }

  }
}