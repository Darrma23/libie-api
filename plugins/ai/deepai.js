const crypto = require("crypto")
const axios = require("axios")
const fs = require("fs")

const CONFIG = {

  API:
    "https://api.deepai.org/hacking_is_a_serious_crime",

  SAVE_SESSION_API:
    "https://api.deepai.org/save_chat_session",

  SESSION_DIR:
    "./temp/deepai-session",

  USER_AGENT:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"

}

const MODELS = {
  standard: "standard"
}

/* =========================
 * Ensure session folder
 * ========================= */

if(!fs.existsSync(CONFIG.SESSION_DIR)){
  fs.mkdirSync(CONFIG.SESSION_DIR,{ recursive:true })
}

/* =========================
 * Session helpers
 * ========================= */

function getSessionPath(id){
  return `${CONFIG.SESSION_DIR}/${id}.json`
}

function loadSession(id){

  try{

    const path = getSessionPath(id)

    if(!fs.existsSync(path)){

      return {
        sessionUuid: crypto.randomUUID(),
        messages: []
      }

    }

    return JSON.parse(
      fs.readFileSync(path,"utf8")
    )

  }

  catch{

    return {
      sessionUuid: crypto.randomUUID(),
      messages: []
    }

  }

}

function saveSession(id,data){

  fs.writeFileSync(
    getSessionPath(id),
    JSON.stringify(data,null,2),
    "utf8"
  )

}

/* =========================
 * Fake MD5
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
                    [l,5*l+1,3*l+5,7*l][k] & 15
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

          ) |

          (f >>> -k)

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
 * Generate fake API key
 * ========================= */

function generateIslandKey(){

  const randomNumber =
    Math.round(
      Math.random() * 100000000000
    ).toString()

  const hash = md5Like(

    CONFIG.USER_AGENT +

    md5Like(

      CONFIG.USER_AGENT +

      md5Like(

        CONFIG.USER_AGENT +
        randomNumber +
        "hackers_become_a_little_stinkier_every_time_they_hack"

      )

    )

  )

  return `tryit-${randomNumber}-${hash}`

}

/* =========================
 * FormData helper
 * ========================= */

function createFormData(fields){

  const form = new FormData()

  for(const [key,value] of Object.entries(fields)){
    form.append(key,value)
  }

  return form

}

/* =========================
 * Headers helper
 * ========================= */

function baseHeaders(extra = {}){

  return {

    "sec-ch-ua-platform":
      `"Android"`,

    "user-agent":
      CONFIG.USER_AGENT,

    "sec-ch-ua":
      `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,

    "sec-ch-ua-mobile":
      "?1",

    "accept":
      "*/*",

    "origin":
      "https://deepai.org",

    "sec-fetch-site":
      "same-site",

    "sec-fetch-mode":
      "cors",

    "sec-fetch-dest":
      "empty",

    "accept-language":
      "id-ID,id;q=0.9",

    "priority":
      "u=1, i",

    ...extra

  }

}

/* =========================
 * Save session to DeepAI
 * ========================= */

async function saveChatSession(session){

  try{

    const form = createFormData({

      uuid:
        session.sessionUuid,

      title:
        "",

      chat_style:
        "chat",

      messages:
        JSON.stringify(session.messages)

    })

    await axios.post(

      CONFIG.SAVE_SESSION_API,

      form,

      {
        headers:
          baseHeaders()
      }

    )

  }

  catch{}

}

/* =========================
 * Param helper
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

  if(config.options && !config.options[value]){

    throw new Error(
      `${config.name} tidak valid`
    )

  }

  return value

}

module.exports = {
  name: "DeepAIChat",
  desc: "Chat AI DeepAI",
  category: "AI",
  method: "GET",
  path: "/deepai-chat",
  params: [
    {
      name:"prompt",
      type:"query",
      model:"text",
      required:true,
      desc:"Pertanyaan user"
    },

    {
      name:"id",
      type:"query",
      model:"text",
      default:"guest",
      desc:"ID session"
    },

    {
      name:"model",
      type:"query",
      model:"select",
      options:MODELS,
      default:"standard",
      desc:"Model AI"
    }

  ],

  example:
    "/ai/deepai-chat?prompt=halo",

  async run(req,res){

    try{

      const prompt =
        getParam(req,this.params[0])

      const id =
        getParam(req,this.params[1])

      const model =
        getParam(req,this.params[2])

      const session =
        loadSession(id)

      const userMessage = {
        role:"user",
        content:prompt
      }

      const chatHistory = [
        ...session.messages,
        userMessage
      ]

      const form = createFormData({
        chat_style:"chat",
        chatHistory:
          JSON.stringify(chatHistory),
        model,
        session_uuid:
          session.sessionUuid,
          
        sensitivity_request_id:
          crypto.randomUUID(),
          
        hacker_is_stinky:
          "very_stinky",

        enabled_tools:
          JSON.stringify([
            "image_generator",
            "image_editor"
          ])

      })

      const apiKey =
        generateIslandKey()

      const response = await axios.post(

        CONFIG.API,

        form,

        {

          headers: {
            ...baseHeaders(),
            "api-key":
              apiKey
          },

          responseType:"text",

          timeout:30000

        }

      )

      const answer =
        response.data?.trim()

      if(!answer){

        throw new Error(
          "Response AI kosong"
        )

      }

      const assistantMessage = {
        role:"assistant",
        content:answer
      }

      session.messages.push(userMessage)
      session.messages.push(assistantMessage)

      saveSession(id,session)

      await saveChatSession(session)

      res.json({
        status:true,
        creator:"Himejima",
        data:{
          prompt,
          result:answer,
          session_uuid:
            session.sessionUuid
        },
        metadata:{
          model,
          total_messages:
            session.messages.length,
          timestamp:
            new Date().toISOString()
        }
      })
    }

    catch(err){
      res.status(500).json({
        status:false,
        message:
          err?.response?.data ||
          err.message,
        timestamp:
          new Date().toISOString()
      })
    }
  }
}