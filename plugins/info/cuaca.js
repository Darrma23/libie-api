const axios = require("axios");
const csv = require("csv-parser");
const { Readable } = require("stream");

let wilayahCache = [];

/* ========================
   LOAD CSV SEKALI
======================== */

async function loadWilayah() {
  if (wilayahCache.length) return wilayahCache;

  const { data } = await axios.get(
    "https://raw.githubusercontent.com/kodewilayah/permendagri-72-2019/main/dist/base.csv",
    { timeout: 20000 }
  );

  const rows = [];

  await new Promise((resolve, reject) => {
    Readable.from(data)
      .pipe(csv())
      .on("data", row => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  wilayahCache = rows;
  return wilayahCache;
}


function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


async function searchWilayah(query) {
  const wilayah = await loadWilayah();
  const tokens = normalize(query).split(/\s+/);
  const results = [];
  for (const w of wilayah) {
    const text = normalize(w.nama);
    const match = tokens.every(t => text.includes(t));
    if (match) {
      results.push(w);
      if (results.length >= 5) break;
    }
  }
  return results;
}

module.exports = {
  name: "BMKG Cuaca",
  desc: "Prakiraan cuaca berdasarkan nama wilayah",
  category: "Info",
  method: "GET",
  path: "/cuaca",
  params: [
    { name: "q", type: "query", required: true, desc: "Nama wilayah" }
  ],
  example: "/info/cuaca?q=muncang bodeh pemalang",

  async run(req, res) {
    try {
      const { q } = req.query;

      if (!q)
        return res.status(400).json({
          status: false,
          message: "Parameter q wajib diisi"
        });

      const results = await searchWilayah(q);

      if (!results.length)
        return res.status(404).json({
          status: false,
          message: "Wilayah tidak ditemukan"
        });

      const wilayah = results[0];
      const adm4 = wilayah.kode;

      const { data } = await axios.get(
        `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`,
        { timeout: 15000 }
      );

      if (!data?.data?.[0])
        throw new Error("Struktur data BMKG tidak valid");

      const cuaca = data.data[0].cuaca;

      const result = cuaca.map((hari, i) => ({
        hari_ke: i + 1,
        prakiraan: hari.map(c => ({
          waktu: c.local_datetime,
          kondisi: c.weather_desc,
          suhu: c.t,
          kelembapan: c.hu,
          angin: `${c.ws} km/j`,
          arah: c.wd,
          icon: c.image?.replace(/ /g, "%20") || null
        }))
      }));

      return res.json({
        status: true,
        creator: "Himejima",
        adm4,
        lokasi: {
          desa: wilayah.nama,
          kecamatan: wilayah.kecamatan,
          kabupaten: wilayah.kabupaten,
          provinsi: wilayah.provinsi
        },
        result
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan server",
        error: err.message
      });
    }
  }
};