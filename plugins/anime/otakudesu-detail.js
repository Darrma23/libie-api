module.exports = {
  name: "Otakudesu Detail",
  desc: "Detail lengkap anime dari Otakudesu",
  category: "Anime",
  method: "GET",
  path: "/otakudesu-detail",

  params: [
    { name: "url", type: "query", required: true, dtype: "string", desc: "URL anime Otakudesu" }
  ],

  example: "/anime/otakudesu-detail?url=https://otakudesu.best/anime/jjk-s3-sub-indo/",

  async run(req, res) {
    try {
      const url = req.query.url?.trim();
      if (!url) throw new Error("Parameter url wajib diisi");

      const Otakudesu = require("../../lib/scrape/otakudesu");
      const otaku = new Otakudesu();

      const data = await otaku.detail(url);

      if (!data) {
        return res.status(404).json({
          status: false,
          message: "Detail tidak ditemukan"
        });
      }

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