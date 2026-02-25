const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

const MAX_SIZE_MB = 50;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
const toMB = (n) => (n / 1024 / 1024).toFixed(1);

module.exports = {
  name: "YouTube Downloader",
  desc: "Download audio / video dari YouTube via ytdlp",
  category: "Downloader",
  method: "GET",
  path: "/ytdlp",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Link video YouTube"
    },
    {
      name: "type",
      type: "query",
      required: false,
      dtype: "string",
      desc: "video / audio (default: video)"
    }
  ],

  example: "/downloader/ytdlp?url=https://youtube.com/watch?v=xxxx&type=audio",

  async run(req, res) {
    try {
      const { url, type = "video" } = req.query;

      /* ✅ VALIDASI URL */
      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= wajib diisi"
        });
      }

      if (!/^https?:\/\//.test(url)) {
        return res.status(400).json({
          status: false,
          message: "URL tidak valid"
        });
      }

      const mode = type.toLowerCase();

      /* ✅ AMBIL INFO VIDEO */
      const { stdout } = await execAsync(
        `yt-dlp -j --no-playlist "${url}"`
      );

      const info = JSON.parse(stdout);

      const size =
        info.filesize ||
        info.filesize_approx ||
        0;

      /* ✅ LIMIT SIZE */
      if (size > MAX_SIZE) {
        return res.status(400).json({
          status: false,
          message: `Ukuran media melebihi ${MAX_SIZE_MB}MB`
        });
      }

      /* ✅ PILIH FORMAT */
      const format =
        mode === "audio"
          ? "bestaudio"
          : "bestvideo+bestaudio/best";

      const downloadUrl = `https://youtube.com/watch?v=${info.id}`;

      res.json({
        status: true,
        creator: "Himejima",
        type: mode,

        data: {
          title: info.title,
          duration: info.duration,
          uploader: info.uploader,
          views: info.view_count,
          thumbnail: info.thumbnail,

          size: size
            ? `${toMB(size)} MB`
            : "Unknown",

          format: mode,
          source: "YouTube",
          download_url: downloadUrl
        },

        metadata: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error("[YTDLP]", err.message);

      res.status(500).json({
        status: false,
        message: "ytdlp error",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};