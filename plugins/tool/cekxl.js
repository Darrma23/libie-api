module.exports = {
  name: "Cek XL / AXIS",
  desc: "Cek status nomor XL / AXIS",
  category: "Tools",
  method: "GET",
  path: "/cekxl",

  params: [
    {
      name: "number",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Nomor HP (08xxx / 62xxx)"
    }
  ],

  example: "/tools/cekxl?number=0817xxxx",

  run: async (req, res) => {
    try {
      let { number } = req.query

      if (!number) {
        return res.status(400).json({
          status: false,
          message: "Parameter number wajib diisi"
        })
      }

      number = number.replace(/\D/g, '')

      if (number.startsWith('08')) {
        number = '62' + number.slice(1)
      }

      if (!/^62\d{8,15}$/.test(number)) {
        return res.status(400).json({
          status: false,
          message: "Format nomor tidak valid"
        })
      }

      const response = await fetch(`https://bendith.my.id/end.php?check=package&number=${number}&version=2`)
      const data = await response.json()

      if (!data.success) {
        return res.status(404).json({
          status: false,
          message: "Nomor tidak valid / tidak aktif"
        })
      }

      res.json({
        status: true,
        creator: "Himejima",
        data: data.data
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      })
    }
  }
}