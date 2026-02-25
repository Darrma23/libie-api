const axios = require('axios')
const crypto = require('crypto')

const delay = ms => new Promise(r => setTimeout(r, ms))

const BASE = 'https://www.nanobana.net'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'origin': BASE,
  'referer': `${BASE}/m/sora2`
}

let cookieStore = {}

function extractCookies(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie) return

  setCookie.forEach(c => {
    const parts = c.split(';')[0].split('=')
    if (parts.length > 1) {
      cookieStore[parts[0]] = parts.slice(1).join('=')
    }
  })
}

function getCookies() {
  return Object.entries(cookieStore)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

async function cekmail(name) {
  const res = await axios.get(`https://akunlama.com/api/v1/mail/list?recipient=${name}`)
  if (Array.isArray(res.data) && res.data.length === 0) {
    return `${name}@akunlama.com`
  }
  throw new Error('Email taken')
}

async function getotp(name) {
  let code = null

  for (let i = 0; i < 20; i++) {
    await delay(3000)

    const res = await axios.get(`https://akunlama.com/api/v1/mail/list?recipient=${name}`)
    const mails = res.data

    if (mails.length > 0) {
      for (const m of mails) {
        const match = m.message.headers.subject.match(/Code:\s*(\d{6})/i)
        if (match) {
          code = match[1]
          break
        }
      }
    }

    if (code) break
  }

  if (!code) throw new Error('CodeTimeout')
  return code
}

async function initSession() {
  const res = await axios.get(`${BASE}/m/sora2`, { headers })
  extractCookies(res)
}

async function sendcode(email) {
  const res = await axios.post(`${BASE}/api/auth/email/send`,
    { email },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  extractCookies(res)
}

async function getCsrf() {
  const res = await axios.get(`${BASE}/api/auth/csrf`, {
    headers: { ...headers, Cookie: getCookies() }
  })
  extractCookies(res)
  return res.data.csrfToken
}

async function login(email, code, csrfToken) {
  const data = `email=${encodeURIComponent(email)}&code=${code}&redirect=false&csrfToken=${csrfToken}&callbackUrl=${encodeURIComponent(BASE + '/m/sora2')}`

  const res = await axios.post(`${BASE}/api/auth/callback/email-code`,
    data,
    {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-auth-return-redirect': '1',
        Cookie: getCookies()
      }
    }
  )

  extractCookies(res)
}

async function getsesi() {
  const res = await axios.get(`${BASE}/api/auth/session`, {
    headers: { ...headers, Cookie: getCookies() }
  })
  extractCookies(res)
}

async function getuserinfo() {
  const res = await axios.post(`${BASE}/api/get-user-info`, '', {
    headers: { ...headers, Cookie: getCookies() }
  })
  extractCookies(res)
}

async function submitsora(prompt, aspect_ratio, n_frames) {
  const res = await axios.post(`${BASE}/api/sora2/text-to-video/generate`,
    {
      prompt,
      aspect_ratio,
      n_frames,
      remove_watermark: true
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Cookie: getCookies()
      }
    }
  )

  extractCookies(res)
  return res.data.taskId
}

async function cekstatus(taskId, prompt) {
  const res = await axios.get(
    `${BASE}/api/sora2/text-to-video/task/${taskId}?save=1&prompt=${encodeURIComponent(prompt)}`,
    { headers: { ...headers, Cookie: getCookies() } }
  )

  extractCookies(res)
  return res.data
}

async function sora2(prompt, aspect_ratio = 'landscape', n_frames = 10) {
  cookieStore = {}

  const randomName = crypto.randomBytes(6).toString('hex')
  const email = await cekmail(randomName)

  await initSession()
  await sendcode(email)

  const code = await getotp(randomName)

  const csrfToken = await getCsrf()
  await login(email, code, csrfToken)
  await getsesi()
  await getuserinfo()

  const taskId = await submitsora(prompt, aspect_ratio, n_frames)
  if (!taskId) throw new Error('TaskIdMissing')

  let result
  do {
    await delay(5000)
    result = await cekstatus(taskId, prompt)
  } while (['processing', 'waiting'].includes(result.status))

  if (result.status === 'failed' || result.status === 'error') {
    throw new Error(result.error_message || 'Generate gagal')
  }

  return {
    task_id: taskId,
    video: result.resultUrls?.[0] || null
  }
}

module.exports = {
  name: "Sora2 Video",
  desc: "Generate video dari text prompt (Nanobana Sora2)",
  category: "AI",
  method: "GET",
  path: "/sora2",

  params: [
    { name: "prompt", type: "query", required: true, dtype: "string", desc: "Teks deskripsi video yang ingin dibuat" },
    { name: "aspect_ratio", type: "query", required: false, dtype: "string", desc: "Rasio video: landscape / portrait" },
    { name: "n_frames", type: "query", required: false, dtype: "number", desc: "Jumlah frame video (misalnya 10)" }
  ],

  example: "/ai-video/sora2?prompt=kucing+berjalan&aspect_ratio=landscape&n_frames=10",

  run: async (req, res) => {
    try {
      const { prompt, aspect_ratio, n_frames } = req.query

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter prompt wajib diisi"
        })
      }

      const result = await sora2(
        prompt,
        aspect_ratio || 'landscape',
        n_frames || '10'
      )

      res.json({
        status: true,
        creator: "himejima",
        data: result,
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (err) {
        console.error("SORA2 ERROR FULL:");
      
        if (err.response) {
          console.error("STATUS:", err.response.status);
          console.error("DATA:", err.response.data);
        } else {
          console.error(err.message);
        }
      
        res.status(500).json({
          status: false,
          message: err.response?.data || err.message,
          timestamp: new Date().toISOString()
        });
      }
  }
}