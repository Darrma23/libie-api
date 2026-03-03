const axios = require("axios");
const cheerio = require("cheerio");

class Genius {
  constructor() {
    this.inst = axios.create({
      baseURL: "https://api.genius.com",
      headers: {
        "user-agent":
          "Genius/8.0.5.4987 (Android; Android 10; samsung SM-J700F)",
        "x-genius-app-background-request": "0",
        "x-genius-logged-out": "true",
        "x-genius-android-version": "8.0.5.4987"
      },
      timeout: 15000
    });
  }

  async search(query) {
    const { data } = await this.inst.get("/search/multi", {
      params: { q: query }
    });

    return (
      data?.response?.sections?.find(s => s.type === "song")?.hits || []
    );
  }

  async detail(id) {
    const { data } = await this.inst.get(`/songs/${id}`);
    return data?.response?.song || null;
  }
}

async function scrapeLyrics(url) {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  const cheerio = require("cheerio");
  const $ = cheerio.load(data);

  let lyrics = "";

  $('[data-lyrics-container="true"]').each((_, el) => {
    const html = $(el).html();
    const withBreaks = html.replace(/<br\s*\/?>/gi, "\n");
    const clean = cheerio.load(withBreaks).text();
    lyrics += clean + "\n\n";
  });

  // buang header & noise
  const firstVerseIndex = lyrics.search(/\[(Intro|Verse|Chorus|Hook)/i);
  if (firstVerseIndex !== -1) {
    lyrics = lyrics.slice(firstVerseIndex);
  }

  lyrics = lyrics.replace(/Embed$/, "").trim();

  return lyrics;
}

module.exports = {
  name: "Lirik",
  desc: "Cari lirik lagu lengkap beserta detail lagu berdasarkan judul",
  category: "Internet",
  method: "GET",
  path: "/lirik",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Judul lagu, contoh: rap god eminem"
    }
  ],

  example: "/internet/lirik?q=rap god eminem",

  async run(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter q wajib diisi"
        });
      }

      const genius = new Genius();
      const results = await genius.search(q);

      if (!results.length) {
        return res.status(404).json({
          status: false,
          message: "Lagu tidak ditemukan"
        });
      }

      const first = results[0].result;
      const song = await genius.detail(first.id);

      if (!song) {
        return res.status(404).json({
          status: false,
          message: "Detail lagu tidak ditemukan"
        });
      }

      const lyrics = await scrapeLyrics(song.url);

      res.json({
        status: true,
        creator: "Himejima",
        query: q,
        data: {
          id: song.id,
          title: song.title,
          artist: song.primary_artist?.name,
          album: song.album?.name || null,
          release_date: song.release_date,
          url: song.url,
          cover: song.song_art_image_url,
          lyrics: lyrics || "Lirik tidak ditemukan"
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};