// plugins/Info/gempa.js
const axios = require("axios");

module.exports = {
  name: "Cek Gempa",
  desc: "Menampilkan informasi gempa bumi terkini dari BMKG",
  category: "Info",
  method: "GET",
  path: "/gempa",

  async run(req, res) {
    try {
      const { data } = await axios.get(
        "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
        { timeout: 10000 }
      );

      const gempa = data?.Infogempa?.gempa;

      if (!gempa) {
        return res.status(404).json({
          status: false,
          message: "Data gempa tidak ditemukan",
        });
      }

      res.status(200).json({
        status: true,
        creator: "Himejima",
        data: {
          waktu: gempa.DateTime,
          lintang: gempa.Lintang,
          bujur: gempa.Bujur,
          koordinat: gempa.Coordinates,
          magnitude: gempa.Magnitude,
          kedalaman: gempa.Kedalaman,
          wilayah: gempa.Wilayah,
          potensi: gempa.Potensi,
          dirasakan: gempa.Dirasakan || null,
          shakemap: `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`,
        },
        metadata: {
          source: "BMKG - AutoGempa",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[Plugin Gempa]", err.message);

      res.status(500).json({
        status: false,
        message: "Gagal mengambil data gempa",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};
