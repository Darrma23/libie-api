const crypto = require("crypto");
const axios = require("axios");

async function fluxdev(prompt, size = "1024x1024") {
  if (!prompt) throw new Error("Prompt is required");

  const device_id = crypto.randomBytes(16).toString("hex");

  try {
    const res = await axios.post(
      "https://api-preview.chatgot.io/api/v1/deepimg/flux-1-dev",
      {
        device_id,
        prompt,
        size,
      },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
          "Content-Type": "application/json",
          referer: "https://deepimg.ai/",
          origin: "https://deepimg.ai",
        },
        timeout: 30000,
      }
    );

    const image = res.data?.data?.images?.[0]?.url;
    if (!image) throw new Error("Image URL not found in response");

    return image;
  } catch (err) {
    throw new Error(
      err.response?.statusText ||
        err.response?.data?.message ||
        err.message
    );
  }
}

module.exports = {
  name: "FluxDev",
  desc: "Generate gambar AI",
  category: "AI",
  method: "GET",
  path: "/fluxdev",

  params: [
    {
      name: "prompt",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Deskripsi gambar yang ingin dibuat",
    },
  ],

  example: "/ai/fluxdev?prompt=cyberpunk+samurai",

  responses: [
    { code: 200, desc: "Berhasil generate gambar" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" },
  ],

  async run(req, res) {
    try {
      const { prompt, size } = req.query;

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?prompt= wajib diisi",
        });
      }

      const finalSize = size || "1024x1024";

      const imageUrl = await fluxdev(prompt, finalSize);

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          prompt,
          size: finalSize,
          image_url: imageUrl,
        },
        metadata: {
          model: "Flux-1-Dev",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[FluxDev]", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};