const axios = require("axios");

module.exports = {
  name: "TikTokDownloader",
  desc: "Download video TikTok tanpa watermark",
  category: "Downloader",
  method: "GET",
  path: "/tiktok",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL video TikTok"
    }
  ],

  example: "/downloader/tiktok?url=https://www.tiktok.com/@username/video/123456789",

  async run(req, res) {
    const { url } = req.query;

    if (!url || !/^https?:\/\/(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com)\/.+/i.test(url)) {
      return res.status(400).json({
        status: false,
        message: "Masukkan parameter ?url= TikTok yang valid.",
        contoh: "?url=https://www.tiktok.com/@username/video/123456789"
      });
    }

    try {
      const apiKey = "ca5c6d6fa3mshfcd2b0a0feac6b7p140e57jsn72684628152a";

      const { data } = await axios.get("https://tiktok-scraper7.p.rapidapi.com", {
        headers: {
          "Accept-Encoding": "gzip",
          "User-Agent": "Mozilla/5.0",
          "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
          "X-RapidAPI-Key": apiKey,
        },
        params: {
          url,
          hd: "1",
        },
      });

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          url_original: url,
          download_url: data.data?.play || data.data?.hdplay || data.data?.url,
          judul: data.data?.title || "TikTok Video",
          durasi: data.data?.duration,
          ukuran: data.data?.size,
          kualitas: data.data?.hd ? "HD" : "SD"
        },
        metadata: {
          source: "TikTok Scraper API",
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("TikTok Download Error:", error.message);

      res.status(500).json({
        status: false,
        message: "Gagal mengambil data TikTok",
        error: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      });
    }
  },
};