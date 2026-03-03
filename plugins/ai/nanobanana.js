const axios = require("axios");
const CryptoJS = require("crypto-js");

const aeskey = "ai-enhancer-web__aes-key";
const aesiv = "aienhancer-aesiv";

const headers = {
  "Content-Type": "application/json",
  Origin: "https://aienhancer.ai",
  Referer: "https://aienhancer.ai/ai-image-editor",
  "User-Agent": "Mozilla/5.0"
};

function encrypt(obj) {
  return CryptoJS.AES.encrypt(
    JSON.stringify(obj),
    CryptoJS.enc.Utf8.parse(aeskey),
    {
      iv: CryptoJS.enc.Utf8.parse(aesiv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  ).toString();
}

async function nsfwcheck(image) {
  const create = await axios.post(
    "https://aienhancer.ai/api/v1/r/nsfw-detection",
    { image },
    { headers, timeout: 20000 }
  );

  const id = create.data?.data?.id;
  if (!id) throw new Error("NSFW task gagal dibuat");

  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2000));

    const res = await axios.post(
      "https://aienhancer.ai/api/v1/r/nsfw-detection/result",
      { task_id: id },
      { headers, timeout: 20000 }
    );

    const data = res.data?.data;

    if (data?.status === "succeeded") {
      return data.output;
    }

    attempts++;
  }

  throw new Error("Timeout NSFW check");
}

async function imageditor(image, prompt) {
  const settings = encrypt({
    prompt,
    size: "2K",
    aspect_ratio: "match_input_image",
    output_format: "jpeg",
    max_images: 1
  });

  const create = await axios.post(
    "https://aienhancer.ai/api/v1/k/image-enhance/create",
    {
      model: 2,
      image,
      function: "ai-image-editor",
      settings
    },
    { headers, timeout: 20000 }
  );

  const id = create.data?.data?.id;
  if (!id) throw new Error("Job gagal dibuat");

  let attempts = 0;
  const maxAttempts = 25;

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2500));

    const res = await axios.post(
      "https://aienhancer.ai/api/v1/k/image-enhance/result",
      { task_id: id },
      { headers, timeout: 20000 }
    );

    const data = res.data?.data;

    if (data?.status === "success") {
      return {
        id,
        output: data.output,
        input: data.input
      };
    }

    attempts++;
  }

  throw new Error("Timeout menunggu hasil AI");
}

async function nanobananaFromUrl(url, prompt) {
  // basic SSRF guard
  if (!/^https?:\/\//.test(url)) {
    throw new Error("URL tidak valid");
  }

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    throw new Error("URL tidak diizinkan");
  }

  const img = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const buffer = Buffer.from(img.data);
  const base64 = buffer.toString("base64");
  const image = `data:image/jpeg;base64,${base64}`;

  const nsfw = await nsfwcheck(image);
  if (nsfw !== "normal") {
    throw new Error("NSFW image blocked");
  }

  return await imageditor(image, prompt);
}

module.exports = {
  name: "NanoBanana",
  desc: "AI Image Edit via AIEnhancer",
  category: "AI",
  method: "GET",
  path: "/nanobanana",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL gambar target"
    },
    {
      name: "prompt",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Instruksi edit gambar"
    }
  ],

  example:
    "/ai/nanobanana?url=https://example.com/photo.jpg&prompt=buat+tersenyum",

  responses: [
    { code: 200, desc: "Berhasil edit gambar" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" }
  ],

  run: async (req, res) => {
    try {
      const { url, prompt } = req.query;

      if (!url || !prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= dan ?prompt= wajib diisi"
        });
      }

      const result = await nanobananaFromUrl(url, prompt);

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          original: result.input,
          prompt,
          result: result.output
        },
        metadata: {
          model: "AIEnhancer v2",
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error("[NanoBanana]", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};