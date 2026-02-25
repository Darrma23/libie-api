const axios = require("axios");
const FormData = require("form-data");

function genserial() {
  let s = "";
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

function detectMime(buffer) {
  if (buffer.slice(0, 4).toString("hex") === "89504e47") {
    return "image/png";
  }
  return "image/jpeg";
}

async function upimage(filename) {
  const form = new FormData();
  form.append("file_name", filename);

  const res = await axios.post(
    "https://api.imgupscaler.ai/api/common/upload/upload-image",
    form,
    {
      headers: {
        ...form.getHeaders(),
        origin: "https://imgupscaler.ai",
        referer: "https://imgupscaler.ai/",
      },
    }
  );

  return res.data.result;
}

async function uploadtoOSS(putUrl, buffer) {
  const type = detectMime(buffer);

  const res = await axios.put(putUrl, buffer, {
    headers: {
      "Content-Type": type,
      "Content-Length": buffer.length,
    },
    maxBodyLength: Infinity,
  });

  return res.status === 200;
}

async function createJob(imageUrl, prompt) {
  const form = new FormData();
  form.append("model_name", "magiceraser_v4");
  form.append("original_image_url", imageUrl);
  form.append("prompt", prompt);
  form.append("ratio", "match_input_image");
  form.append("output_format", "jpg");

  const res = await axios.post(
    "https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "product-code": "magiceraser",
        "product-serial": genserial(),
        origin: "https://imgupscaler.ai",
        referer: "https://imgupscaler.ai/",
      },
    }
  );

  return res.data.result.job_id;
}

async function cekjob(jobId) {
  const res = await axios.get(
    `https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`,
    {
      headers: {
        origin: "https://imgupscaler.ai",
        referer: "https://imgupscaler.ai/",
      },
    }
  );

  return res.data;
}

async function nanobanana(buffer, prompt) {
  const mime = detectMime(buffer);
  const filename = `upload.${mime === "image/png" ? "png" : "jpg"}`;

  const uploadInfo = await upimage(filename);

  const uploaded = await uploadtoOSS(uploadInfo.url, buffer);
  if (!uploaded) throw new Error("Gagal upload ke OSS");

  const cdn = "https://cdn.imgupscaler.ai/" + uploadInfo.object_name;
  const jobId = await createJob(cdn, prompt);

  let result;
  do {
    await new Promise((r) => setTimeout(r, 3000));
    result = await cekjob(jobId);
  } while (result.code === 300006); // processing

  if (!result?.data?.image_url) {
    throw new Error("Image hasil tidak ditemukan");
  }

  return result.data.image_url;
}

module.exports = {
  name: "NanoBanana",
  desc: "AI Image Edit (Magic Eraser / Replace / Modify)",
  category: "AI",
  method: "GET",
  path: "/nanobanana",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL gambar target",
    },
    {
      name: "prompt",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Instruksi edit gambar",
    },
  ],

  example:
    "/ai/nanobanana?url=https://example.com/photo.jpg&prompt=remove+background",

  responses: [
    { code: 200, desc: "Berhasil edit gambar" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" },
  ],

  async run(req, res) {
    try {
      const { url, prompt } = req.query;

      if (!url || !prompt) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= dan ?prompt= wajib diisi",
        });
      }

      const img = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        timeout: 20000,
      });

      const buffer = Buffer.from(img.data);

      const resultImage = await nanobanana(buffer, prompt);

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          original: url,
          prompt,
          result: resultImage,
        },
        metadata: {
          model: "magiceraser_v4",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[NanoBanana]", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};