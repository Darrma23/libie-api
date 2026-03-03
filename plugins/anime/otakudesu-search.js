module.exports = {
  name: "Otakudesu Search",
  desc: "Cari anime di Otakudesu berdasarkan judul",
  category: "Anime",
  method: "GET",
  path: "/otakudesu-search",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Judul anime yang ingin dicari"
    }
  ],

  example: "/anime/otakudesu-search?q=jujutsu kaisen",

  async run(req, res) {
    try {
      const q = req.query.q?.trim();

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter q wajib diisi"
        });
      }

      const Otakudesu = require("../../lib/scrape/otakudesu");
      const otaku = new Otakudesu();

      const results = await otaku.search(q);

      if (!results.length) {
        return res.status(404).json({
          status: false,
          message: "Anime tidak ditemukan"
        });
      }

      res.json({
        status: true,
        creator: "Himejima",
        query: q,
        total: results.length,
        timestamp: new Date().toISOString(),
        data: results
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