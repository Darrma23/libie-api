const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

function detectMime(buffer) {
  const hex = buffer.slice(0, 4).toString("hex");

  if (hex === "89504e47") return "image/png";
  if (hex.startsWith("52494646")) return "image/webp";

  return "image/jpeg";
}

async function createjob(buffer, productSerial) {
  const form = new FormData();

  const mime = detectMime(buffer);
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
      ? "webp"
      : "jpg";

  form.append("original_image_file", buffer, {
    filename: `upload.${ext}`,
    contentType: mime,
  });

  form.append("output_format", "jpg");
  form.append("is_remove_text", "true");
  form.append("is_remove_logo", "true");
  form.append("is_enhancer", "true");

  const r = await axios.post(
    "https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/create-job",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "Product-Serial": productSerial,
        "Product-Code": "067003",
        origin: "https://unwatermark.ai",
        referer: "https://unwatermark.ai/",
      },
      maxBodyLength: Infinity,
      timeout: 30000,
    }
  );

  return r.data.result.job_id;
}

async function getjob(jobId, productSerial) {
  const r = await axios.get(
    `https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/get-job/${jobId}`,
    {
      headers: {
        "Product-Serial": productSerial,
        "Product-Code": "067003",
        origin: "https://unwatermark.ai",
        referer: "https://unwatermark.ai/",
      },
      timeout: 30000,
    }
  );

  return r.data;
}

async function unwatermark(buffer) {
  const productSerial = crypto.randomUUID();
  const jobId = await createjob(buffer, productSerial);

  while (true) {
    await new Promise((r) => setTimeout(r, 3000));

    const s = await getjob(jobId, productSerial);

    if (s.code === 100000 && s.result?.output_url) {
      return {
        job_id: jobId,
        input_url: s.result.input_url,
        output_url: Array.isArray(s.result.output_url)
          ? s.result.output_url[0]
          : s.result.output_url,
      };
    }

    if (s.code !== 100000 && s.code !== 300006) {
      throw new Error("Job gagal / response aneh");
    }
  }
}

module.exports = {
  name: "UnwatermarkAI",
  desc: "Hapus watermark gambar",
  category: "Maker",
  method: "GET",
  path: "/unwatermark",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL gambar yang ingin dibersihkan",
    },
  ],

  example: "/ai/unwatermark?url=https://example.com/watermark.jpg",

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= wajib diisi",
        });
      }

      const img = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
      });

      const buffer = Buffer.from(img.data);

      const result = await unwatermark(buffer);

      res.json({
        status: true,
        creator: "Himejima",
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[UnwatermarkAI]", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};