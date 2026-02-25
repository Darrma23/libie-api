const axios = require("axios");

const MAX_SIZE_MB = 50;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
const toMB = (n) => (n / 1024 / 1024).toFixed(1);

module.exports = {
  name: "AllInOneDownloader",
  desc: "Downloader multi-platform (video, image, audio, file)",
  category: "Downloader",
  method: "GET",
  path: "/aio",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Link media sosial (TikTok, IG, dll)"
    }
  ],

  example: "/downloader/aio?url=https://vt.tiktok.com/xxxx",

  responses: [
    { code: 200, desc: "Berhasil" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" }
  ],

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= wajib diisi"
        });
      }

      const api = `https://api.zm.io.vn/v1/social/autolink?url=${encodeURIComponent(url)}`;

      const response = await axios.get(api, {
        headers: {
          apikey: "TrveEwAFsiyAMLEZcAq"
        },
        timeout: 20000
      });

      const json = response.data;

      if (json.error) {
        return res.status(400).json({
          status: false,
          message: json.message || "Link tidak didukung"
        });
      }

      const medias = json.medias || [];
      if (!medias.length) {
        return res.status(400).json({
          status: false,
          message: "Media tidak ditemukan"
        });
      }

      const videos = medias.filter(v => v.type === "video");
      const images = medias.filter(v => v.type === "image");
      const audio = medias.find(v => v.type === "audio");
      const archive = medias.find(v =>
        !["video", "audio", "image"].includes(v.type)
      );

      /* ================= VIDEO ================= */
      if (videos.length) {
        const video =
          videos.find(v => v.quality === "hd_no_watermark") ||
          videos.find(v => v.quality === "no_watermark") ||
          videos[0];

        const size = Number(video.data_size) || 0;

        return res.json({
          status: true,
          creator: "Himejima",
          type: "video",
          data: {
            source: json.source,
            author: json.author || "-",
            title: json.title || "-",
            quality: video.quality || "-",
            size: size ? `${toMB(size)} MB` : "Unknown",
            download_url: video.url
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      /* ================= IMAGE ================= */
      if (images.length) {
        return res.json({
          status: true,
          creator: "Himejima",
          type: "image",
          total: images.length,
          data: images.map(img => ({
            resolution: img.resolution || "-",
            url: img.url
          })),
          metadata: {
            source: json.source,
            title: json.title || "-",
            timestamp: new Date().toISOString()
          }
        });
      }

      /* ================= AUDIO ================= */
      if (audio) {
        return res.json({
          status: true,
          creator: "Himejima",
          type: "audio",
          data: {
            source: json.source,
            title: json.title || "-",
            mime: audio.mimeType || "audio/mp4",
            extension: audio.extension || "m4a",
            download_url: audio.url
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      /* ================= FILE ================= */
      if (archive) {
        return res.json({
          status: true,
          creator: "Himejima",
          type: archive.type,
          data: {
            source: json.source,
            extension: archive.extension || "bin",
            download_url: archive.url
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      throw new Error("Media terdeteksi tapi tidak bisa diproses");

    } catch (err) {
      console.error("[AIO]", err.message);

      res.status(500).json({
        status: false,
        message: "Downloader error",
        error: err.response?.data || err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};