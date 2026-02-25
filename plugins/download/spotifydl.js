const axios = require('axios')
const { zencf } = require('zencf')

const UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'

let cookieHeaders = {
  'user-agent': UA,
  'content-type': 'application/json',
  origin: 'https://spotidownloader.com',
  referer: 'https://spotidownloader.com/'
}

async function gettoken() {
  const { token } = await zencf.turnstileMin(
    'https://spotidownloader.com/en13',
    '0x4AAAAAAA8QAiFfE5GuBRRS'
  )

  const r = await axios.post(
    'https://api.spotidownloader.com/session',
    { token },
    { headers: cookieHeaders }
  )

  if (!r.data?.token) throw new Error('Gagal ambil bearer token')

  return r.data.token
}

async function searchspotify(query, bearer) {
  const r = await axios.post(
    'https://api.spotidownloader.com/search',
    { query },
    {
      headers: {
        ...cookieHeaders,
        authorization: `Bearer ${bearer}`
      }
    }
  )

  return r.data
}

async function dlspotify(id, bearer) {
  const r = await axios.post(
    'https://api.spotidownloader.com/download',
    { id },
    {
      headers: {
        ...cookieHeaders,
        authorization: `Bearer ${bearer}`
      }
    }
  )

  if (!r.data?.link) throw new Error('Link download tidak ditemukan')

  return r.data.link
}

module.exports = {
  name: "Spotify Downloader",
  desc: "Search atau download lagu dari Spotify via SpotiDownloader",
  category: "Downloader",
  method: "GET",
  path: "/spotify",

  params: [
    {
      name: "query",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Link Spotify / ID track / kata kunci pencarian"
    }
  ],

  example: "/downloader/spotify?query=night+changes",

  run: async (req, res) => {
    try {
      const { query } = req.query

      if (!query) {
        return res.status(400).json({
          status: false,
          message: "Parameter query wajib diisi"
        })
      }

      const bearer = await gettoken()

      // 🎯 Kalau link track
      if (/spotify\.com\/track\//i.test(query)) {
        const id = query.split('/track/')[1].split('?')[0]
        const link = await dlspotify(id, bearer)

        return res.json({
          status: true,
          creator: "himejima",
          data: {
            type: "download",
            id,
            link
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      }

      // 🎯 Kalau ID langsung
      if (/^[a-zA-Z0-9]{22}$/.test(query)) {
        const link = await dlspotify(query, bearer)

        return res.json({
          status: true,
          data: {
            type: "download",
            id: query,
            link
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      }

      // 🔎 Kalau search
      const results = await searchspotify(query, bearer)

      res.json({
        status: true,
        data: {
          type: "search",
          query,
          results
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (err) {
      console.error("SPOTIFY ERROR:", err.message)

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}