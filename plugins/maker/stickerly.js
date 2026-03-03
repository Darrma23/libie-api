const axios = require("axios");

async function smartSearchSticker(keyword = "anime") {
  const response = await axios.post(
    "https://api.sticker.ly/v4/stickerPack/smartSearch",
    {
      keyword,
      enabledKeywordSearch: true,
      filter: {
        extendSearchResult: false,
        sortBy: "RECOMMENDED",
        languages: ["ALL"],
        minStickerCount: 5,
        searchBy: "ALL",
        stickerType: "ALL",
      },
    },
    {
      headers: {
        "User-Agent":
          "androidapp.stickerly/3.25.2 (220333QAG; U; Android 30; ms-MY; id;)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-duid": Buffer.from(String(Date.now())).toString("base64"),
      },
      timeout: 30000,
    }
  );

  const packs = response.data?.result?.stickerPacks || [];

  return packs.map((pack) => {
    const prefix = pack.resourceUrlPrefix;

    return {
      id: pack.id,
      name: pack.name,
      author: pack.author?.name || null,
      total_stickers: pack.stickerCount,
      thumbnail: prefix + pack.thumbnail,
      resource_zip: prefix + pack.resourceZip,
      stickers: pack.resourceFiles.map((file) =>
        file.startsWith("http") ? file : prefix + file
      ),
    };
  });
}

module.exports = {
  name: "StickerSearch",
  desc: "Search sticker pack dari Sticker.ly",
  category: "Maker",
  method: "GET",
  path: "/stickersearch",

  params: [
    {
      name: "q",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Keyword pencarian sticker",
    },
    {
      name: "limit",
      type: "query",
      required: false,
      dtype: "number",
      desc: "Jumlah pack yang ditampilkan (default: 5)",
    },
  ],

  example: "/tools/stickersearch?q=anime&limit=3",

  responses: [
    { code: 200, desc: "Berhasil mendapatkan sticker pack" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" },
  ],

  async run(req, res) {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?q= wajib diisi",
        });
      }

      const packs = await smartSearchSticker(q);

      const finalLimit = parseInt(limit) || 5;

      res.json({
        status: true,
        creator: "Himejima",
        data: packs.slice(0, finalLimit),
        metadata: {
          total_found: packs.length,
          returned: packs.slice(0, finalLimit).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[StickerSearch]", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};