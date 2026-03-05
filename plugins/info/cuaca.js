// plugins/Info/cuaca.js
const axios = require("axios")

const APIKEY = "060a6bcfa19809c2cd4d97a212b19273"

module.exports = {
  name: "Cuaca",
  desc: "Informasi cuaca real-time",
  category: "Info",
  method: "GET",
  path: "/cuaca",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      desc: "Nama kota"
    }
  ],

  example: "/info/cuaca?q=jakarta",

  async run(req, res) {

    try {

      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter q wajib diisi"
        })
      }

      const { data } = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            q,
            units: "metric",
            appid: APIKEY
          }
        }
      )

      const result = {
        name: data.name,
        country: data.sys.country,
        weather: data.weather[0].main,
        description: data.weather[0].description,
        temperature: {
          current: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          min: Math.round(data.main.temp_min),
          max: Math.round(data.main.temp_max)
        },
        humidity: data.main.humidity,
        wind: {
          speed: data.wind.speed,
          deg: data.wind.deg
        },
        clouds: data.clouds?.all,
        visibility: data.visibility,
        timestamp: new Date().toISOString()
      }

      res.json({
        status: true,
        creator: "Himejima",
        data: result
      })

    } catch (err) {

      console.error("[Plugin Cuaca]", err?.response?.data || err)

      res.status(500).json({
        status: false,
        message: "Lokasi tidak ditemukan / API error",
        error: err.message
      })

    }

  }
}