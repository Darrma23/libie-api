// plugins/Anime/komiku-detail.js
const axios = require("axios");
const cheerio = require("cheerio");

const headers = {
  "User-Agent": "Mozilla/5.0",
  "Referer": "https://komiku.org/"
};

module.exports = {
  name: "Komiku Detail",
  desc: "Detail manga dari Komiku",
  category: "Anime",
  method: "GET",
  path: "/komiku-detail",
  params: [
    {
      name: "url",
      type: "query",
      required: true,
      desc: "URL manga"
    }
  ],
  example: "/anime/komiku-detail?url=https://komiku.org/manga/naruto/",

  async run(req, res) {
    const url = req.query.url;

    if (!url || !url.startsWith("https://komiku.org")) {
      return res.status(400).json({
        status: false,
        message: "URL tidak valid"
      });
    }

    try {
      const { data } = await axios.get(url, {
        headers,
        timeout: 15000
      });

      const $ = cheerio.load(data);

      const title =
        $("#Judul h1 span").first().text().trim() ||
        $("h1.entry-title").text().trim();

      const cover =
        $(".ims img").attr("src") ||
        $(".thumb img").attr("src") ||
        null;

      const synopsis =
        $(".desc").text().trim() ||
        $(".entry-content p").first().text().trim() ||
        null;

      const chapters = [];

      $("#daftarChapter tr, .clstyle li").each((_, el) => {
        const a = $(el).find("a").first();
        const chTitle = a.text().trim();
        const chUrl = a.attr("href");

        if (chTitle && chUrl) {
          chapters.push({
            title: chTitle,
            url: chUrl.startsWith("http")
              ? chUrl
              : `https://komiku.org${chUrl}`
          });
        }
      });

      return res.json({
        status: true,
        creator: "Himejima",
        result: {
          title,
          cover,
          synopsis,
          total_chapters: chapters.length,
          latest_chapters: chapters.slice(0, 10)
        }
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Gagal mengambil detail manga",
        error: err.message
      });
    }
  }
};