// plugins/Downloader/spotify.js
const axios = require("axios");
const { Buffer } = require("buffer");

function msToTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getAccessToken() {
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            "7bbae52593da45c69a27c853cc22edff:88ae1f7587384f3f83f62a279e7f87af"
          ).toString("base64"),
      },
      timeout: 15000,
    }
  );

  if (!res.data?.access_token)
    throw new Error("Gagal generate token Spotify");

  return res.data.access_token;
}

async function searchSpotify(query) {
  const token = await getAccessToken();

  const res = await axios.get("https://api.spotify.com/v1/search", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      q: query,
      type: "track",
      limit: 1,
      market: "ID",
    },
    timeout: 15000,
  });

  const item = res.data.tracks?.items?.[0];
  if (!item) throw new Error("Lagu tidak ditemukan");

  return {
    title: item.name,
    artist: item.artists?.map(a => a.name).join(", "),
    duration_ms: item.duration_ms,
    cover: item.album?.images?.[0]?.url,
    url: item.external_urls?.spotify,
  };
}

async function getDownloadInfo(spotifyUrl) {
  const headers = {
    "content-type": "application/json",
    origin: "https://sssspotify.com",
    referer: "https://sssspotify.com/",
    "user-agent": "Mozilla/5.0",
  };

  const res = await axios.post(
    "https://sssspotify.com/api/download/get-url",
    { url: spotifyUrl },
    { headers, timeout: 20000 }
  );

  if (res.data?.code !== 200 || !res.data.originalVideoUrl)
    throw new Error("Gagal mendapatkan URL download");

  const encodedPart = res.data.originalVideoUrl.replace(
    "/api/download/dl?url=",
    ""
  );

  return {
    title: res.data.title,
    artist: res.data.authorName,
    cover: res.data.coverUrl,
    download: `https://sssspotify.com/api/download/dl?url=${encodedPart}`,
  };
}

module.exports = {
  name: "Spotify Downloader",
  desc: "Search dan ambil link MP3 dari Spotify",
  category: "Downloader",
  method: "GET",
  path: "/spotify",
  params: [
    { name: "q", type: "query", required: false, desc: "Judul lagu" },
    { name: "url", type: "query", required: false, desc: "URL track Spotify" },
  ],
  example: "/downloader/spotify?q=alan walker faded",

  async run(req, res) {
    try {
      const { q, url } = req.query;

      if (!q && !url)
        return res.status(400).json({
          status: false,
          message: "Parameter q atau url wajib diisi",
        });

      let track;

      if (q) {
        track = await searchSpotify(q);
      } else {
        track = { url };
      }

      const downloadInfo = await getDownloadInfo(track.url);

      return res.json({
        status: true,
        creator: "Himejima",
        result: {
          title: downloadInfo.title || track.title,
          artist: downloadInfo.artist || track.artist,
          duration: track.duration_ms
            ? msToTime(track.duration_ms)
            : null,
          cover: downloadInfo.cover || track.cover,
          source: track.url,
          download: downloadInfo.download,
        },
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  },
};