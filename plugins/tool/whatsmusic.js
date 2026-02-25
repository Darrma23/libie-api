const axios = require('axios')
const acrcloud = require('acrcloud')

const acr = new acrcloud({
  host: "identify-eu-west-1.acrcloud.com",
  access_key: "c9f2fca5e16a7986b0a6c8ff70ed0a06",
  access_secret: "PQR9E04ZD60wQPgTSRRqwkBFIWEZldj0G3q7NJuR"
})

module.exports = {
  name: "WhatMusic",
  desc: "Identifikasi lagu dari URL audio/video",
  category: "Tools",
  method: "GET",
  path: "/whatsmusic",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL file audio/video publik"
    }
  ],

  example: "/tools/whatsmusic?url=https://example.com/audio.mp3",

  run: async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter url wajib diisi"
        })
      }

      const media = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000
      })

      const buffer = Buffer.from(media.data)
      const result = await acr.identify(buffer)

      if (result.status.code !== 0) {
        return res.status(404).json({
          status: false,
          message: result.status.msg
        })
      }

      const music = result.metadata?.music?.[0]

      const durationMs = music.duration_ms || null
      
      let duration = null
      if (durationMs) {
        const totalSec = Math.floor(durationMs / 1000)
        const minutes = Math.floor(totalSec / 60)
        const seconds = totalSec % 60
        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      
      const data = {
        title: music.title || null,
        artists: music.artists?.map(a => a.name) || [],
        album: music.album?.name || null,
        genres: music.genres?.map(g => g.name) || [],
        release_date: music.release_date || null,
        duration
      }

      res.json({
        status: true,
        creator: "himejima",
        data: {
          ...data,
          duration
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (err) {
      console.error("WHATSMUSIC ERROR:", err.message)

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}