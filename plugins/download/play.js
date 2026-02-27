// plugins/Downloader/play.js
const axios = require("axios");

function formatDuration(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  origin: "https://v5.ytmp4.is",
  referer: "https://v5.ytmp4.is/"
};

module.exports = {
  name: "Play Music",
  desc: "Search dan ambil link audio dari YouTube",
  category: "Downloader",
  method: "GET",
  path: "/play",
  params: [
    {
      name: "q",
      type: "query",
      required: true,
      desc: "Judul lagu"
    }
  ],
  example: "/downloader/play?q=avenged sevenfold nightmare",

  async run(req, res) {
    try {
      const query = req.query.q;
      if (!query)
        return res.status(400).json({
          status: false,
          message: "Parameter q wajib diisi"
        });

      // 1️⃣ Search
      const search = await axios.get(
        `https://test.flvto.online/search/?q=${encodeURIComponent(query)}`,
        { headers, timeout: 15000 }
      );

      if (!search.data.items || !search.data.items.length)
        return res.status(404).json({
          status: false,
          message: "Lagu tidak ditemukan"
        });

      const item = search.data.items[0];

      // 2️⃣ Convert ke MP3
      const convert = await axios.post(
        "https://ht.flvto.online/converter",
        {
          id: item.id,
          fileType: "mp3"
        },
        {
          headers: {
            ...headers,
            "Content-Type": "application/json",
            origin: "https://ht.flvto.online",
            referer: `https://ht.flvto.online/button?url=https://www.youtube.com/watch?v=${item.id}&fileType=mp3`
          },
          timeout: 20000
        }
      );

      const data = convert.data;

      if (!data.link)
        throw new Error("Gagal mendapatkan link download");

      return res.json({
     status: true,
     creator: "Himejima",
     result: {
       title: data.title,
       duration: formatDuration(data.duration),
       filesize: formatSize(data.filesize),
       thumbnail: item.thumbMedium,
       source: `https://youtu.be/${item.id}`,
       download: data.link
     }
   });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Gagal memproses lagu",
        error: err.message
      });
    }
  }
};