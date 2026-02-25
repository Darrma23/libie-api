const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    exec(`yt-dlp ${args}`, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

module.exports = {
  name: "YouTubeDownloader",
  desc: "Download YouTube MP4 & MP3 (server merge)",
  category: "Downloader",
  method: "GET",
  path: "/youtube",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL video YouTube",
    },
    {
      name: "format",
      type: "query",
      required: false,
      dtype: "string",
      desc: "mp4 / mp3 (default = mp4)",
    },
  ],

  example: "/downloader/youtube?url=https://youtu.be/dQw4w9WgXcQ&format=mp3",

  async run(req, res) {
    try {
      const { url, format = "mp4" } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= wajib diisi",
        });
      }

      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({
          status: false,
          message: "URL tidak valid",
        });
      }

      // filename unik
      const id = crypto.randomBytes(8).toString("hex");
      const dir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      const mp4File = path.join(dir, `${id}.mp4`);
      const mp3File = path.join(dir, `${id}.mp3`);

      if (format.toLowerCase() === "mp3") {
        // download audio dan convert
        await runYtdlp(
          `-x --audio-format mp3 -o "${mp3File}" "${url}"`
        );

        return res.download(mp3File, (err) => {
          if (!err) fs.unlinkSync(mp3File);
        });
      }

      // default = mp4
      await runYtdlp(
        `-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best" --merge-output-format mp4 -o "${mp4File}" "${url}"`
      );

      return res.download(mp4File, (err) => {
        if (!err) fs.unlinkSync(mp4File);
      });

    } catch (err) {
      console.error("[YouTubeDownloader]", err);
      res.status(500).json({
        status: false,
        message: String(err),
      });
    }
  },
};