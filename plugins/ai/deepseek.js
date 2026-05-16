const axios = require("axios")
const crypto = require("crypto")
const fs = require("fs")

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
}

const MODELS = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner"
}

async function getSecretKey() {

  const res = await axios.get(CONFIG.URLS.KEY,{
    headers:{ "User-Agent":"Android" },
    timeout:10000
  })

  const key = res.data?.rotatingKey

  if(!key){
    throw new Error("rotatingKey kosong")
  }

  return key
}

function generateSecurityHeaders(secretKey){

  const iv = crypto.randomBytes(16)

  const keyBuffer = Buffer.from(
    secretKey.padEnd(16,"0").substring(0,16),
    "utf8"
  )

  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    keyBuffer,
    iv
  )

  let encrypted = cipher.update(CONFIG.AES_INPUT_KEY,"utf8")
  encrypted = Buffer.concat([encrypted,cipher.final()])

  return {
    iv: iv.toString("base64"),
    authorization: "Bearer " + encrypted.toString("base64")
  }

}

async function toBase64(input){

  let buffer
  let contentType = "image/jpeg"

  if(/^https?:\/\//.test(input)){

    const res = await axios.get(input,{
      responseType:"arraybuffer",
      timeout:15000
    })

    contentType = res.headers["content-type"]

    if(!contentType?.startsWith("image")){
      throw new Error("URL bukan file gambar")
    }

    buffer = Buffer.from(res.data)

  }

  else if(fs.existsSync(input)){
    buffer = fs.readFileSync(input)
  }

  else{
    throw new Error("Image tidak valid")
  }

  return {
    base64: buffer.toString("base64"),
    contentType
  }

}

function getParam(req,config){

  let value = req.query[config.name]

  if(value === undefined || value === ""){
    value = config.default
  }

  if(config.required && !value){
    throw new Error(`Parameter ${config.name} diperlukan`)
  }

  if(config.options && !config.options[value]){
    throw new Error(
      `${config.name} tidak valid. Pilihan: ${Object.keys(config.options).join(", ")}`
    )
  }

  return value
}

module.exports = {

  name: "DeepseekChat",
  desc: "Chat AI Deepseek",
  category: "AI",
  method: "GET",
  path: "/deepseek",

  params: [

    {
      name:"prompt",
      type:"query",
      model:"text",
      required:true,
      desc:"Teks pertanyaan ke AI"
    },

    {
      name:"image",
      type:"query",
      model:"text",
      desc:"URL gambar (optional)"
    },

    {
      name:"model",
      type:"query",
      model:"select",
      options: MODELS,
      default:"deepseek-chat",
      desc:"Model AI"
    }

  ],

  example:"/ai/deepseek?prompt=Halo+AI",

  async run(req,res){

    try{

      const prompt = getParam(req,this.params[0])
      const image = getParam(req,this.params[1])
      const model = getParam(req,this.params[2])

      const secretKey = await getSecretKey()
      const security = generateSecurityHeaders(secretKey)

      const now = new Date().toLocaleString("id-ID",{
        timeZone:"Asia/Jakarta"
      })

      const enhancedPrompt = `${prompt}\n\nWaktu saat ini: ${now}`

      const payload = {
        data: enhancedPrompt,
        iv: security.iv,
        messages: [{ role:"user", content: enhancedPrompt }],
        model,
        secretKey
      }

      if(image){
        const img = await toBase64(image)
        payload.image1 = `data:${img.contentType};base64,${img.base64}`
      }

      const response = await axios.post(
        CONFIG.URLS.CHAT,
        payload,
        {
          headers:{
            ...CONFIG.HEADERS,
            authorization: security.authorization
          },
          timeout:20000
        }
      )

      const result =
        response.data?.data?.choices?.[0]?.message?.content

      if(!result){
        throw new Error("Response AI kosong")
      }

      res.json({
        status:true,
        creator:"Himejima",
        data:{
          prompt,
          result
        },
        metadata:{
          model,
          timestamp:new Date().toISOString()
        }
      })

    }

    catch(err){

      res.status(500).json({
        status:false,
        message:err.message,
        timestamp:new Date().toISOString()
      })

    }

  }

}