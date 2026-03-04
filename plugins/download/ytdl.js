const axios = require("axios");

function formatDuration(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function extractId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }

  return null;
}

module.exports = {
  name: "YouTube Downloader",
  desc: "Download YouTube ke MP3 atau MP4",
  category: "Downloader",
  method: "GET",
  path: "/ytdl",
  params: [
    { name: "url", type: "query", required: true, desc: "Link youtube" },
    { name: "type", type: "query", required: false, desc: "mp3/mp4" }
  ],
  example: "/downloader/ytdl?url=https://youtu.be/xxxx&type=mp3",

  async run(req, res) {
    try {
      const { url, type = "mp4" } = req.query;

      if (!url)
        return res.status(400).json({
          status: false,
          message: "Parameter url wajib diisi"
        });

      if (!["mp3", "mp4"].includes(type))
        return res.status(400).json({
          status: false,
          message: "Type harus mp3 atau mp4"
        });

      const id = extractId(url);
      if (!id)
        return res.status(400).json({
          status: false,
          message: "URL tidak valid"
        });

      const { data } = await axios.get(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${id}`,
        {
          headers: {
            "x-rapidapi-host":
              "ytstream-download-youtube-videos.p.rapidapi.com",
            "x-rapidapi-key": "6fabfe3ba0msha10853256d5c5f9p1c1247jsnf1625ea46cb6"
          },
          timeout: 20000
        }
      );

   if (!data) {
     throw new Error("Gagal ambil data");
   }
   
   const thumb = Array.isArray(data.thumbnail)
     ? data.thumbnail.sort((a, b) => b.width - a.width)[0]?.url
     : data.thumbnail;
   
   let downloadLink;

   if (type === "mp3") {
     const audioFormats = data.adaptiveFormats?.filter(f =>
       f.mimeType?.includes("audio")
     );
   
     const bestAudio = audioFormats?.sort(
       (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
     )[0];
   
     if (!bestAudio) throw new Error("Audio tidak ditemukan");
   
     downloadLink = bestAudio.url;
   }
   
   if (type === "mp4") {
     const videoFormats = data.formats?.filter(f =>
       f.mimeType?.includes("video/mp4")
     );
   
     const bestVideo = videoFormats?.sort(
       (a, b) => (b.height || 0) - (a.height || 0)
     )[0];
   
     if (!bestVideo) throw new Error("Video tidak ditemukan");
   
     downloadLink = bestVideo.url;
   }

      if (!downloadLink)
        throw new Error("Format tidak tersedia");

      return res.json({
        status: true,
        creator: "Himejima",
        result: {
          thumbnail: thumb,
          title: data.title,
          duration: formatDuration(data.lengthSeconds || 0),
          type,
          download: downloadLink
        }
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Gagal memproses video",
        error: err.message
      });
    }
  }
};