module.exports = {
  name: "Otakudesu Complete",
  desc: "Daftar anime completed",
  category: "Anime",
  method: "GET",
  path: "/otakudesu-complete",

  params: [
    { name: "page", type: "query", required: false, dtype: "number", desc: "Nomor halaman (default 1)" }
  ],

  example: "/anime/otakudesu-complete?page=1",

  async run(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;

      const Otakudesu = require("../../lib/scrape/otakudesu");
      const otaku = new Otakudesu();

      const data = await otaku.complete(page);

      res.json({
        status: true,
        creator: "Himejima",
        page,
        ...data
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  }
};