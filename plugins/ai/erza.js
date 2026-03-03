const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

class EzRemove {
  constructor() {
    const ip = [10, crypto.randomInt(256), crypto.randomInt(256), crypto.randomInt(256)].join('.');

    this.inst = axios.create({
      baseURL: 'https://api.photoeditorai.io',
      headers: {
        'product-serial': `browser_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        origin: 'https://ezremove.ai',
        referer: 'https://ezremove.ai/',
        'user-agent': 'Mozilla/5.0',
        'x-requested-with': 'XMLHttpRequest',
        'x-forwarded-for': ip
      },
      timeout: 20000
    });

    this.models = {
      'seedream-4.0': 'seedream',
      'nano-banana': 'nano_banana',
      'qwen-image-edit': 'qwen_image_editor',
      'flux-kontext': 'flux_kontext'
    };
  }

  async generate({ prompt, imageBuffer, model }) {
    if (!this.models[model]) {
      throw new Error(`Model tersedia: ${Object.keys(this.models).join(', ')}`);
    }

    const form = new FormData();
    form.append('model_name', this.models[model]);
    form.append('prompt', prompt);
    form.append('ratio', 'match_input_image');

    form.append('target_images', imageBuffer, {
      filename: `${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });

    const { data: task } = await this.inst.post(
      '/pe/photo-editor/create-job',
      form,
      { headers: form.getHeaders() }
    );

    console.log("CREATE JOB RESPONSE:", task);

    const jobId =
      task?.result?.job_id ||
      task?.job_id ||
      task?.data?.job_id;

    if (!jobId) {
      throw new Error("Gagal mendapatkan job_id. Response: " + JSON.stringify(task));
    }

    let attempt = 0;
    const maxAttempt = 30;

    while (attempt < maxAttempt) {
      const { data } = await this.inst.get(`/pe/photo-editor/get-job/${jobId}`);

      if (data?.result?.status === 2) {
        return {
          resultUrl: data.result.output?.[0],
          jobId
        };
      }

      if (data?.result?.error) {
        throw new Error(data.result.error);
      }

      attempt++;
      await new Promise(r => setTimeout(r, 2000));
    }

    throw new Error("Timeout menunggu hasil AI.");
  }
}

module.exports = {
  name: "EzRemoveAI",
  desc: "AI Image Editor dengan URL input",
  category: "AI",
  method: "POST",
  path: "/ezremove",
  
  example: {
    method: "POST",
    url: "/ai/ezremove",
    body: {
      imageUrl: "https://files.catbox.moe/w9gw1z.jpg",
      prompt: "ubah warna baju jadi merah",
      model: "nano-banana"
    }
  },

  params: [
    {
      name: "imageUrl",
      type: "body",
      required: true,
      dtype: "string",
      desc: "URL gambar publik (jpg/png/webp, maksimal 5MB)"
    },
    {
      name: "prompt",
      type: "body",
      required: true,
      dtype: "string",
      desc: "Instruksi edit gambar"
    },
    {
      name: "model",
      type: "body",
      required: false,
      dtype: "string",
      desc: "Model AI (default: nano-banana)"
    }
  ],

  async run(req, res) {
    try {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();

      const { imageUrl, prompt, model = "nano-banana" } = req.body;

      if (!imageUrl || !prompt) {
        return res.status(400).json({
          status: false,
          message: "imageUrl dan prompt wajib diisi"
        });
      }

      let parsed;
      try {
        parsed = new URL(imageUrl);
      } catch {
        return res.status(400).json({
          status: false,
          message: "URL tidak valid"
        });
      }

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({
          status: false,
          message: "Protocol tidak valid"
        });
      }

      const hostname = parsed.hostname;
      if (
        hostname === "localhost" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("172.")
      ) {
        return res.status(400).json({
          status: false,
          message: "Host tidak diizinkan"
        });
      }

      const imgResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024
      });

      const contentType = imgResponse.headers["content-type"] || "";

      if (!/^image\/(png|jpe?g|webp)/.test(contentType)) {
        return res.status(400).json({
          status: false,
          message: "File harus berupa gambar (png/jpg/webp)"
        });
      }

      const imageBuffer = Buffer.from(imgResponse.data);

      const ez = new EzRemove();
      const { resultUrl, jobId } = await ez.generate({
        prompt,
        imageBuffer,
        model
      });

      const processingTime = Date.now() - startTime;

      return res.json({
        status: true,
        creator: "Himejima",
        request_id: requestId,
        timestamp: new Date().toISOString(),
        meta: {
          model,
          processing_time_ms: processingTime,
          job_id: jobId,
          source_image: imageUrl
        },
        data: {
          result_url: resultUrl
        }
      });

    } catch (err) {
      console.error("EZREMOVE ERROR:", err.message);

      return res.status(500).json({
        status: false,
        message: err.message
      });
    }
  }
};