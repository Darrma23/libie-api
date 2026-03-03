const axios = require("axios");

module.exports = {
  name: "OCR",
  desc: "Ekstrak teks dari gambar (Auto Detect)",
  category: "Tools",
  method: "POST",
  path: "/ocr",

  params: [
    {
      name: "imageUrl",
      type: "body",
      required: true,
      dtype: "string",
      desc: "URL gambar dari Cloudflare R2"
    }
  ],

  async run(req, res) {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          status: false,
          message: "imageUrl wajib diisi"
        });
      }

      // ================= VALIDASI URL =================

      let parsed;
      try {
        parsed = new URL(imageUrl);
      } catch {
        return res.status(400).json({
          status: false,
          message: "Format URL tidak valid"
        });
      }

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({
          status: false,
          message: "Protocol tidak valid"
        });
      }

      // Hanya boleh dari R2 lu
      if (!imageUrl.startsWith(process.env.R2_PUBLIC_URL)) {
        return res.status(400).json({
          status: false,
          message: "Sumber gambar tidak diizinkan"
        });
      }

      // ================= DOWNLOAD FILE =================

      const imgResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024 // 10MB
      });

      const contentType = imgResponse.headers["content-type"] || "";

      if (!/^image\/(png|jpe?g|webp)/.test(contentType)) {
        return res.status(400).json({
          status: false,
          message: "File harus berupa gambar (png/jpg/webp)"
        });
      }

      const base64 = Buffer.from(imgResponse.data).toString("base64");

      // ================= OCR REQUEST =================

      const ocrResponse = await axios.post(
        "https://api.ocr.space/parse/image",
        new URLSearchParams({
          apikey: "K81525520188957",
          base64Image: `data:${contentType};base64,${base64}`,
          language: "auto"
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: 15000
        }
      );

      const text = ocrResponse.data?.ParsedResults?.[0]?.ParsedText;

      if (!text) {
        return res.status(404).json({
          status: false,
          message: "Teks tidak terdeteksi"
        });
      }

      // ================= SUCCESS =================

      res.json({
        status: true,
        language_used: "auto",
        data: {
          text: text.trim()
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  }
};