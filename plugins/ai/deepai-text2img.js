const axios = require("axios")
const crypto = require("crypto")

const CONFIG = {
  BASE_URL: "https://api.deepai.org",
  ORIGIN: "https://deepai.org",
  MODEL: "text2img",

  HEADERS: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",

    "Accept": "*/*",
    "Accept-Language": "id-ID,id;q=0.9",
    "Origin": "https://deepai.org",

    "Sec-CH-UA":
      `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,

    "Sec-CH-UA-Mobile": "?1",
    "Sec-CH-UA-Platform": `"Android"`,

    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",

    "Priority": "u=1, i"
  }
}

/* =========================
 * Fake MD5 Generator
 * ========================= */

function md5Like(input){

  const a = []

  for(let b = 0; b < 64; ){
    a[b] = 0 | (4294967296 * Math.sin(++b % Math.PI))
  }

  let d
  let e
  let f

  let g = [
    (d = 1732584193),
    (e = 4023233417),
    ~d,
    ~e
  ]

  const h = []

  let l = unescape(encodeURI(input)) + "\u0080"

  let k = l.length

  let c = ((--k / 4 + 2) | 15)

  h[--c] = 8 * k

  while(~k){
    h[k >> 2] |= l.charCodeAt(k) << (8 * k--)
  }

  for(let b = 0, l = 0; b < c; b += 16){

    for(
      k = g;

      l < 64;

      k = [
        (f = k[3]),

        d + (
          (
            (
              f =
                k[0] +
                [
                  d & e | ~d & f,
                  f & d | ~f & e,
                  d ^ e ^ f,
                  e ^ (d | ~f)
                ][(k = l >> 4)] +

                a[l] +

                ~~h[
                  b |
                  (
                    [l, 5 * l + 1, 3 * l + 5, 7 * l][k] & 15
                  )
                ]

            ) << (
              k = [
                7,12,17,22,
                5,9,14,20,
                4,11,16,23,
                6,10,15,21
              ][4 * k + (l++ % 4)]
            )

          ) | (f >>> -k)
        ),

        d,
        e
      ]
    ){

      d = k[1] | 0
      e = k[2]

    }

    for(l = 4; l; ){
      g[--l] += k[l]
    }

  }

  let result = ""

  for(let l = 0; l < 32; ){
    result += (
      (g[l >> 3] >> (4 * (1 ^ l++))) & 15
    ).toString(16)
  }

  return result
    .split("")
    .reverse()
    .join("")

}

/* =========================
 * Generate Island Key
 * ========================= */

function generateIslandKey(){

  const userAgent =
    CONFIG.HEADERS["User-Agent"]

  const randomNumber =
    Math.round(
      Math.random() * 100000000000
    ).toString()

  const hash = md5Like(

    userAgent +

    md5Like(

      userAgent +

      md5Like(

        userAgent +
        randomNumber +
        "hackers_become_a_little_stinkier_every_time_they_hack"

      )

    )

  )

  return `tryit-${randomNumber}-${hash}`

}

/* =========================
 * Create FormData
 * ========================= */

function createFormData(fields){

  const form = new FormData()

  for(const [key,value] of Object.entries(fields)){
    form.append(key,value)
  }

  return form

}

/* =========================
 * Param Helper
 * ========================= */

function getParam(req,config){

  let value = req.query[config.name]

  if(value === undefined || value === ""){
    value = config.default
  }

  if(config.required && !value){
    throw new Error(
      `Parameter ${config.name} diperlukan`
    )
  }

  return value

}

module.exports = {
  name: "DeepAI",
  desc: "Generate gambar AI DeepAI",
  category: "AI",
  method: "GET",
  path: "/deepai",
  params: [
    {
      name: "prompt",
      type: "query",
      model: "text",
      required: true,
      desc: "Prompt gambar"
    },

    {
      name: "width",
      type: "query",
      model: "number",
      default: "640",
      desc: "Lebar gambar"
    },

    {
      name: "height",
      type: "query",
      model: "number",
      default: "640",
      desc: "Tinggi gambar"
    }

  ],

  example:
    "/ai/deepai?prompt=Ferrari+Cyberpunk",

  async run(req,res){

    try{

      const prompt =
        getParam(req,this.params[0])

      const width =
        getParam(req,this.params[1])

      const height =
        getParam(req,this.params[2])

      const apiKey =
        generateIslandKey()

      const form =
        createFormData({
          text: prompt,
          width,
          height,
          image_generator_version: "hd",
          use_new_model: "false",
          use_old_model: "false",
          quality: "true",
          generation_source: "img"
        })

      const response = await axios.post(

        `${CONFIG.BASE_URL}/api/text2img`,

        form,

        {
          headers: {
            ...CONFIG.HEADERS,
            "api-key": apiKey
          },
          timeout: 30000
        }
      )

      const data = response.data

      if(!data?.output_url){

        throw new Error(
          "Gagal generate gambar"
        )

      }

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          model: CONFIG.MODEL,
          prompt,
          id: data.id,
          url: data.output_url,
          backend_request_id:
            data.backend_request_id || null
        },

        metadata: {
          width,
          height,
          timestamp:
            new Date().toISOString()
        }
      })
    }

    catch(err){

      res.status(500).json({

        status: false,

        message:
          err?.response?.data ||
          err.message,

        timestamp:
          new Date().toISOString()

      })

    }

  }

}