module.exports = {
  name: "Jadwal Sholat",
  desc: "Jadwal sholat berdasarkan kota di Indonesia",
  category: "Islamic",
  method: "GET",
  path: "/jadwalsholat",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      desc: "Nama Kota"
    }
  ],

  example: "/jadwalsholat?q=semarang",

  async run(req, res) {
    try {

      const { q } = req.query
      const kota = (q || "").toLowerCase().trim()

      if (!kota) {
        return res.status(400).json({
          status: false,
          message: "Parameter q diperlukan"
        })
      }

      // ambil daftar kota
      const kotaRes = await fetch("https://api.myquran.com/v2/sholat/kota/semua")
      const kotaJson = await kotaRes.json()

      const found = kotaJson.data.find(c =>
        c.lokasi.toLowerCase() === kota ||
        c.lokasi.toLowerCase() === `kota ${kota}` ||
        c.lokasi.toLowerCase().includes(kota)
      )

      if (!found) {
        return res.status(404).json({
          status: false,
          message: `Kota "${kota}" tidak ditemukan`
        })
      }

      const cityId = found.id

      // tanggal hari ini WIB
      const d = new Date()
      const y = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" })
      const m = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", month: "2-digit" })
      const day = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", day: "2-digit" })
      const today = `${y}/${m}/${day}`

      // ambil jadwal sholat
      const jadwalRes = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${cityId}/${today}`)
      const jadwalJson = await jadwalRes.json()

      const j = jadwalJson?.data?.jadwal

      if (!j) {
        return res.status(500).json({
          status: false,
          message: "Jadwal tidak tersedia"
        })
      }

      res.status(200).json({
        status: true,
        creator: "Himejima",
        data: {
          kota: found.lokasi,
          provinsi: jadwalJson.data.daerah,
          tanggal: j.date,
          jadwal: {
            imsak: j.imsak,
            subuh: j.subuh,
            dzuhur: j.dzuhur,
            ashar: j.ashar,
            maghrib: j.maghrib,
            isya: j.isya
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan",
        error: e.message
      })

    }
  }
};