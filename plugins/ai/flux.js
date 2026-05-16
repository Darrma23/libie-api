const crypto = require("crypto")
const axios = require("axios")

async function fluxdev(prompt){

  const device_id = crypto.randomBytes(16).toString("hex")

  const res = await axios.post(
    "https://api-preview.chatgot.io/api/v1/deepimg/flux-1-dev",
    {
      device_id,
      prompt
    },
    {
      headers:{
        "User-Agent":
          "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "Content-Type":"application/json",
        referer:"https://deepimg.ai/",
        origin:"https://deepimg.ai"
      },
      timeout:30000
    }
  )

  const image = res.data?.data?.images?.[0]?.url

  if(!image){
    throw new Error("Image URL not found")
  }

  return image
}

function getParam(req,config){

  let value = req.query[config.name]

  if(value === undefined || value === ""){
    value = config.default
  }

  if(config.required && !value){
    throw new Error(`Parameter ${config.name} diperlukan`)
  }

  return value
}

module.exports = {

  name:"FluxDev",
  desc:"Generate gambar AI",
  category:"AI",
  method:"GET",
  path:"/fluxdev",

  params:[
    {
      name:"q",
      type:"query",
      model:"text",
      required:true,
      desc:"Deskripsi gambar"
    }
  ],

  example: "/ai/fluxdev?q=cyberpunk samurai",

  async run(req,res){

    try{

      const prompt = getParam(req,this.params[0])

      const imageUrl = await fluxdev(prompt)

      res.json({
        status:true,
        creator:"Himejima",
        data:{
          prompt,
          image_url:imageUrl
        },
        metadata:{
          model:"Flux-1-Dev",
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