// plugins/Anime/komiku-search.js
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  name: "Komiku Search",
  desc: "Mencari manga dari Komiku",
  category: "Anime",
  method: "GET",
  path: "/komiku-search",
  params: [
    {
      name: "q",
      type: "query",
      required: true,
      desc: "Judul manga"
    }
  ],
  
  example: "/anime/komiku-search?q=Naruto",

  async run(req, res) {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter q wajib diisi"
      });
    }

    try {
      const { data } = await axios.get("https://api.komiku.org/", {
        params: {
          s: query,
          post_type: "manga"
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://komiku.org/"
        }
      });

      const $ = cheerio.load(data);
      const results = [];

      $(".bge").each((_, el) => {
        const title = $(el).find("h3").text().trim();
        const url = $(el).find("a").first().attr("href");
        const image = $(el).find("img").attr("src");

        if (title && url) {
          results.push({
            title,
            url: url.startsWith("http")
              ? url
              : `https://komiku.org${url}`,
            image
          });
        }
      });

      return res.json({
        status: true,
        creator: "Himejima",
        total: results.length,
        result: results.slice(0, 10)
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      });
    }
  }
};