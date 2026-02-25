const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");

const CONFIG = {
  URLS: {
    CHAT: "https://deepseekv2-qbvg2hl3qq-uc.a.run.app",
    KEY: "https://rotatingkey-qbvg2hl3qq-uc.a.run.app",
  },
  HEADERS: {
    "User-Agent": "okhttp/4.12.0",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
  },
  AES_INPUT_KEY: "NiIsImtpZCI6I56",
};

async function getSecretKey() {
  try {
    const res = await axios.get(CONFIG.URLS.KEY, {
      headers: { "User-Agent": "Android" },
      timeout: 10000,
    });

    const key = res.data?.rotatingKey;
    if (!key) throw new Error("rotatingKey kosong");

    return key;
  } catch (err) {
    console.error("[Deepseek] rotatingKey:", err.message);
    return null;
  }
}

function generateSecurityHeaders(secretKey) {
  try {
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(
      secretKey.padEnd(16, "0").substring(0, 16),
      "utf8"
    );

    const cipher = crypto.createCipheriv("aes-128-cbc", keyBuffer, iv);

    let encrypted = cipher.update(CONFIG.AES_INPUT_KEY, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      iv: iv.toString("base64"),
      authorization: "Bearer " + encrypted.toString("base64"),
    };
  } catch (err) {
    console.error("[Deepseek] Security:", err.message);
    return null;
  }
}

async function toBase64(input) {
  try {
    let buffer, contentType = "image/jpeg";

    if (/^https?:\/\//.test(input)) {
      const res = await axios.get(input, {
        responseType: "arraybuffer",
        timeout: 15000,
      });

      contentType = res.headers["content-type"];
      if (!contentType?.startsWith("image")) return null;

      buffer = Buffer.from(res.data);
    } else if (fs.existsSync(input)) {
      buffer = fs.readFileSync(input);
    } else {
      return null;
    }

    return {
      base64: buffer.toString("base64"),
      contentType,
    };
  } catch (err) {
    console.error("[Deepseek] Base64:", err.message);
    return null;
  }
}

module.exports = {
  name: "DeepseekChat",
  desc: "Chat AI Deepseek",
  category: "AI",
  method: "GET",
  path: "/deepseek",

  params: [
    { name: "prompt", type: "query", required: true, dtype: "string", desc: "Teks pertanyaan ke AI" },
    { name: "model", type: "query", required: false, dtype: "string", desc: "deepseek-chat / deepseek-reasoner" },
    { name: "image", type: "query", required: false, dtype: "string", desc: "URL gambar (optional)" }
  ],

  example: "/ai/deepseek?prompt=Halo+AI",

  async run(req, res) {
    try {
      const { prompt, model, image } = req.query;

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?prompt= wajib diisi",
        });
      }

      const allowedModels = ["deepseek-chat","deepseek-reasoner"];
      const finalModel = allowedModels.includes(model) ? model : "deepseek-chat";

      const secretKey = await getSecretKey();
      if (!secretKey) throw new Error("Gagal mengambil rotatingKey");

      const security = generateSecurityHeaders(secretKey);
      if (!security) throw new Error("Gagal generate security header");

      const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

      const enhancedPrompt = `${prompt}\n\nWaktu saat ini: ${now}`;

      let payload = {
        data: enhancedPrompt,
        iv: security.iv,
        messages: [{ role: "user", content: enhancedPrompt }],
        model: finalModel,
        secretKey,
      };

      if (image) {
        const img = await toBase64(image);
        if (!img) throw new Error("Image tidak valid / gagal convert");

        payload.image1 = `data:${img.contentType};base64,${img.base64}`;
      }

      const response = await axios.post(CONFIG.URLS.CHAT, payload, {
        headers: { ...CONFIG.HEADERS, authorization: security.authorization },
        timeout: 20000,
      });

      const apiResult = response.data?.data;
      const reply = apiResult?.choices?.[0]?.message?.content;

      if (!reply) throw new Error("Response AI kosong");

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          prompt,
          reply,
        },
        metadata: {
          model: finalModel,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (err) {
      console.error("[Deepseek ERROR]:", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};