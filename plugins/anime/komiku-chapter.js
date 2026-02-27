// plugins/Anime/komiku-chapter.js
const axios = require("axios");
const cheerio = require("cheerio");

const headers = {
  "User-Agent": "Mozilla/5.0",
  "Referer": "https://komiku.org/"
};

module.exports = {
  name: "Komiku Chapter",
  desc: "Ambil gambar chapter manga Komiku",
  category: "Anime",
  method: "GET",
  path: "/komiku-chapter",
  params: [
    {
      name: "url",
      type: "query",
      required: true,
      desc: "URL chapter"
    }
  ],
  example: "/anime/komiku-chapter?url=https://komiku.org/naruto-chapter-1/",

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
        $("#Judul h1").text().trim() ||
        $("h1.entry-title").text().trim() ||
        null;

      const images = [];

      $("#Baca_Komik img, .reader-area img").each((i, el) => {
        const src =
          $(el).attr("src") ||
          $(el).attr("data-src") ||
          $(el).attr("data-lazy-src");

        if (src && src.startsWith("http")) {
          images.push(src);
        }
      });

      return res.json({
        status: true,
        creator: "Himejima",
        result: {
          title,
          total_pages: images.length,
          images
        }
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Gagal mengambil chapter",
        error: err.message
      });
    }
  }
};