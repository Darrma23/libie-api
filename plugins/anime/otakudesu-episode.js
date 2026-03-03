module.exports = {
  name: "Otakudesu Episode",
  desc: "Detail episode + mirror streaming",
  category: "Anime",
  method: "GET",
  path: "/otakudesu-episode",

  params: [
    { name: "url", type: "query", required: true, dtype: "string", desc: "URL episode Otakudesu" }
  ],

  example: "/anime/otakudesu-episode?url=https://otakudesu.best/episode/jjk-s3-episode-1/",

  async run(req, res) {
    try {
      const url = req.query.url?.trim();
      if (!url) throw new Error("Parameter url wajib diisi");

      const Otakudesu = require("../../lib/scrape/otakudesu");
      const otaku = new Otakudesu();

      const data = await otaku.episode(url);

      res.json({
        status: true,
        creator: "Himejima",
        data
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  }
};