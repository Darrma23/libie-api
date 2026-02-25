const yts = require('yt-search');

module.exports = {
  name: "YouTube Search",
  desc: "Cari video YouTube",
  category: "Tools",
  method: "GET",
  path: "/yts",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Keyword pencarian"
    },
    {
      name: "limit",
      type: "query",
      required: false,
      dtype: "number",
      desc: "Jumlah hasil (default: 3)"
    }
  ],

  example: "/tools/yts?q=superman theme&limit=5",

  async run(req, res) {
    try {
      const { q, limit = 3 } = req.query;

      /* ✅ VALIDASI */
      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?q= wajib diisi"
        });
      }

      const lim = Math.min(Number(limit) || 3, 10);

      /* 🔎 SEARCH */
      const r = await yts(q);

      if (!r.videos.length) {
        return res.status(404).json({
          status: false,
          message: "Video tidak ditemukan"
        });
      }

      const videos = r.videos.slice(0, lim);

      res.json({
        status: true,
        creator: "Himejima",

        data: videos.map(v => ({
          title: v.title,
          url: v.url,
          duration: v.timestamp,
          views: v.views,
          author: v.author?.name,
          ago: v.ago,
          thumbnail: v.thumbnail
        })),

        metadata: {
          total_found: r.videos.length,
          returned: videos.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error("[YTS]", err.message);

      res.status(500).json({
        status: false,
        message: "Search error",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};