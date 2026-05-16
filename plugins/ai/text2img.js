const STYLES = {
  photorealistic: "Photorealistic",
  "digital-art": "Digital Art",
  impressionist: "Impressionist",
  anime: "Anime",
  fantasy: "Fantasy",
  "sci-fi": "Sci-Fi",
  vintage: "Vintage",
  watercolor: "Watercolor",
  ghibli: "Ghibli",
  cyberpunk: "Cyberpunk",
  surrealist: "Surrealist",
  minimalist: "Minimalist",
  baroque: "Baroque"
}

const RESOLUTIONS = {
  "512x512": "512x512",
  "768x768": "768x768",
  "1024x1024": "1024x1024",
  "1280x720": "1280x720",
  "1920x1080": "1920x1080"
}

const ASPECT_RATIOS = {
  square: "square",
  portrait: "portrait",
  landscape: "landscape"
}

async function generate(prompt, options = {}) {

  const {
    style = "anime",
    resolution = "512x512",
    aspectRatio = "square",
    numImages = 1
  } = options

  const page = await fetch("https://genmyart.com/")
  const html = await page.text()

  const nonceMatch = html.match(/_ajax_nonce:\s*'([a-f0-9]+)'/)
  const ajaxNonce = nonceMatch?.[1]

  if (!ajaxNonce) {
    throw new Error("Nonce tidak ditemukan")
  }

  const params = new URLSearchParams({
    action: "generate_ai_image",
    ai_prompt: prompt,
    ai_style: style,
    ai_resolution: resolution,
    ai_aspect_ratio: aspectRatio,
    ai_num_images: numImages.toString(),
    _ajax_nonce: ajaxNonce
  })

  const res = await fetch(
    "https://genmyart.com/wp-admin/admin-ajax.php",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://genmyart.com/"
      },
      body: params.toString()
    }
  )

  const result = await res.json()

  if (!result.success) {
    throw new Error("Generate gagal")
  }

  return result.images || []
}

function getParam(req, config) {

  let value = req.query[config.name]

  if (value === undefined || value === "") {
    value = config.default
  }

  if (config.required && !value) {
    throw new Error(`Parameter ${config.name} diperlukan`)
  }

  if (config.model === "number") {
    value = parseInt(value)

    if (isNaN(value)) {
      value = config.default
    }

    if (config.min !== undefined) {
      value = Math.max(config.min, value)
    }

    if (config.max !== undefined) {
      value = Math.min(config.max, value)
    }
  }

  if (config.options && !config.options[value]) {
    throw new Error(
      `${config.name} tidak valid. Pilihan: ${Object.keys(config.options).join(", ")}`
    )
  }

  return value
}

module.exports = {

  name: "GenMyArt AI",
  desc: "Generate AI Image (genmyart)",
  category: "AI",
  method: "GET",
  path: "/genmyart",

  params: [

    {
      name: "q",
      type: "query",
      model: "text",
      required: true,
      desc: "Prompt text"
    },

    {
      name: "style",
      type: "query",
      model: "select",
      options: STYLES,
      default: "anime"
    },

    {
      name: "resolution",
      type: "query",
      model: "select",
      options: RESOLUTIONS,
      default: "512x512"
    },

    {
      name: "ratio",
      type: "query",
      model: "select",
      options: ASPECT_RATIOS,
      default: "square"
    },

    {
      name: "num",
      type: "query",
      model: "number",
      min: 1,
      max: 6,
      default: 1
    }

  ],

  example: "/ai/genmyart?q=anime girl",

  async run(req, res) {

    try {

      const prompt = getParam(req, this.params[0])
      const style = getParam(req, this.params[1])
      const resolution = getParam(req, this.params[2])
      const ratio = getParam(req, this.params[3])
      const num = getParam(req, this.params[4])

      const images = await generate(prompt,{
        style,
        resolution,
        aspectRatio: ratio,
        numImages: num
      })

      res.json({
        status: true,
        creator: "Himejima",
        prompt,
        style,
        resolution,
        ratio,
        total: images.length,
        images
      })

    } catch(err) {

      res.status(400).json({
        status:false,
        message: err.message
      })
    }
  }
}