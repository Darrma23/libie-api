const axios = require("axios")
const FormData = require("form-data")
const crypto = require("crypto")

const MODELS = {
  "seedream-4.0": "seedream",
  "nano-banana": "nano_banana",
  "qwen-image-edit": "qwen_image_editor",
  "flux-kontext": "flux_kontext"
}

class EzRemove {

  constructor() {

    const ip = [10, crypto.randomInt(256), crypto.randomInt(256), crypto.randomInt(256)].join(".")

    this.inst = axios.create({
      baseURL: "https://api.photoeditorai.io",
      headers: {
        "product-serial": `browser_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
        origin: "https://ezremove.ai",
        referer: "https://ezremove.ai/",
        "user-agent": "Mozilla/5.0",
        "x-requested-with": "XMLHttpRequest",
        "x-forwarded-for": ip
      },
      timeout: 20000
    })

  }

  async generate({ prompt, imageBuffer, model }) {

    const form = new FormData()

    form.append("model_name", MODELS[model])
    form.append("prompt", prompt)
    form.append("ratio", "match_input_image")

    form.append("target_images", imageBuffer, {
      filename: `${Date.now()}.jpg`,
      contentType: "image/jpeg"
    })

    const { data: task } = await this.inst.post(
      "/pe/photo-editor/create-job",
      form,
      { headers: form.getHeaders() }
    )

    const jobId =
      task?.result?.job_id ||
      task?.job_id ||
      task?.data?.job_id

    if (!jobId) {
      throw new Error("Gagal mendapatkan job_id")
    }

    let attempt = 0

    while (attempt < 30) {

      const { data } = await this.inst.get(`/pe/photo-editor/get-job/${jobId}`)

      if (data?.result?.status === 2) {
        return {
          resultUrl: data.result.output?.[0],
          jobId
        }
      }

      if (data?.result?.error) {
        throw new Error(data.result.error)
      }

      attempt++
      await new Promise(r => setTimeout(r,2000))
    }

    throw new Error("Timeout menunggu hasil AI")
  }

}


function getParam(req, config) {

  let value = req.body[config.name]

  if (value === undefined || value === "") {
    value = config.default
  }

  if (config.required && !value) {
    throw new Error(`Parameter ${config.name} diperlukan`)
  }

  if (config.options && !config.options[value]) {
    throw new Error(
      `${config.name} tidak valid. Pilihan: ${Object.keys(config.options).join(", ")}`
    )
  }

  return value
}


module.exports = {

  name: "EzRemoveAI",
  desc: "AI Image Editor dengan URL input",
  category: "AI",
  method: "POST",
  path: "/ezremove",

  params: [
    {
      name: "imageUrl",
      type: "body",
      model: "text",
      required: true,
      desc: "URL gambar publik (jpg/png/webp)"
    },
    {
      name: "prompt",
      type: "body",
      model: "text",
      required: true,
      desc: "Instruksi edit gambar"
    },
    {
      name: "model",
      type: "body",
      model: "select",
      options: MODELS,
      default: "nano-banana",
      desc: "Model AI"
    }
  ],

  example: "/ai/ezremove?imageurl=https://files.catbox.moe/w9gw1z.jpg",

  async run(req,res) {

    try {

      const startTime = Date.now()
      const requestId = crypto.randomUUID()

      const imageUrl = getParam(req,this.params[0])
      const prompt = getParam(req,this.params[1])
      const model = getParam(req,this.params[2])

      const parsed = new URL(imageUrl)

      if (!["http:","https:"].includes(parsed.protocol)) {
        throw new Error("Protocol tidak valid")
      }

      const imgResponse = await axios.get(imageUrl,{
        responseType:"arraybuffer",
        timeout:15000,
        maxContentLength:5*1024*1024
      })

      const contentType = imgResponse.headers["content-type"] || ""

      if (!/^image\/(png|jpe?g|webp)/.test(contentType)) {
        throw new Error("File harus berupa gambar")
      }

      const imageBuffer = Buffer.from(imgResponse.data)

      const ez = new EzRemove()

      const { resultUrl, jobId } = await ez.generate({
        prompt,
        imageBuffer,
        model
      })

      const processingTime = Date.now() - startTime

      res.json({
        status:true,
        creator:"Himejima",
        request_id:requestId,
        timestamp:new Date().toISOString(),
        meta:{
          model,
          processing_time_ms:processingTime,
          job_id:jobId,
          source_image:imageUrl
        },
        data:{
          result_url:resultUrl
        }
      })

    }

    catch(err){

      res.status(500).json({
        status:false,
        message:err.message
      })

    }

  }

}