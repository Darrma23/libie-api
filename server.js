require('dotenv').config()

const pkg = require('./package.json')
const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const morgan = require('morgan')
const os = require('os')
const crypto = require('crypto')
const { execSync } = require('child_process')
const chokidar = require("chokidar")
const helmet = require("helmet")

const { ipLimiter, getIP } = require('./lib/iplimiter')
const redis = require('./lib/redis')

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', 1)
app.set('json spaces', 2)

const CREATOR = "Himejima"

function getFingerprint(req) {
  const ip = getIP(req)
  const ua = req.headers['user-agent'] || ''

  return crypto
    .createHash("sha1")
    .update(ip + ua)
    .digest("hex")
}

/* ================= MIDDLEWARE ================= */

app.use(helmet())
app.disable("x-powered-by")

app.use(cors())
app.use(morgan('dev'))

app.use(express.json({ limit: "3mb" }))
app.use(express.urlencoded({ extended:true, limit:"3mb" }))

app.use(express.static(path.join(__dirname,'public')))
app.use('/files', express.static(path.join(process.cwd(),'files')))

app.use('/api', ipLimiter)

/* inject creator */

app.use((req,res,next)=>{

  const original = res.json

  res.json = function(body){
    if(body && typeof body === "object" && !Buffer.isBuffer(body)){
      if("status" in body){
        body = {
          status: body.status,
          creator: CREATOR,
          ...Object.fromEntries(
            Object.entries(body).filter(([k]) => k !== "status")
          )
        }
      } else {
        body = {
          creator: CREATOR,
          ...body
        }
      }
    }
    return original.call(this, body)

  }
  next()
})

/* ================= API STATS ================= */

app.use('/api', async (req,res,next)=>{

  try {

    if (
      req.path.startsWith('/stats') ||
      req.path.startsWith('/info') ||
      req.path.startsWith('/status') ||
      req.path.startsWith('/debug')
    ) {
      return next()
    }

    const today = new Date().toISOString().slice(0,10)

    const fingerprint = getFingerprint(req)

    const pipe = redis.multi()

    pipe.incr("stats:hits:all")
    pipe.incr(`stats:hits:${today}`)
    pipe.sAdd("stats:users", fingerprint)
    pipe.incr(`stats:user:${fingerprint}`)

    await pipe.exec()

  } catch {}

  next()

})

/* ================= FILE UPLOAD ================= */

const fileUpload = require("express-fileupload")

app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true,
  responseOnLimit: {
    status:false,
    message:"File terlalu besar (max 10MB)"
  }
}))

/* ================= PLUGIN ROUTER ================= */

let pluginRouter = express.Router()
app.use('/api', pluginRouter)

const loadedPlugins = new Map()

let apiList = []
let count = 0

/* ================= LOAD PLUGINS ================= */

function loadPlugins(){

  pluginRouter.stack = []

  const pluginsDir = path.join(__dirname,"plugins")

  if(!fs.existsSync(pluginsDir)){
    return
  }

  apiList = []

  const categories = fs.readdirSync(pluginsDir)

  categories.forEach(category=>{

    const categoryPath = path.join(pluginsDir,category)

    if(!fs.statSync(categoryPath).isDirectory()) return

    const files = fs.readdirSync(categoryPath).filter(v=>v.endsWith(".js"))

    files.forEach(file=>{

      const filePath = path.join(categoryPath,file)

      delete require.cache[require.resolve(filePath)]

      const plugin = require(filePath)

      if(!plugin.name || !plugin.method || !plugin.path || typeof plugin.run !== "function"){
        return
      }

      const method = plugin.method.toLowerCase()

      const fullPath = `/${category}/${plugin.path}`.replace(/\/+/g,"/")

      const handler = async(req,res)=>{
        try{
          await plugin.run(req,res)
        }catch(err){
          res.status(500).json({
            status:false,
            message:err.message
          })
        }
      }

      pluginRouter[method](fullPath,handler)

      loadedPlugins.set(filePath,{
        method,
        fullPath
      })

      apiList.push({
        nama:plugin.name,
        deskripsi:plugin.desc,
        kategori:category,
        method:plugin.method.toUpperCase(),
        endpoint:`/api${fullPath}`,
        params:plugin.params || []
      })

      count++

      console.log(`✔ ${method.toUpperCase()} /api${fullPath}`)

    })

  })

}

/* ================= WATCH PLUGINS ================= */

const watcher = chokidar.watch(
  path.join(__dirname,"plugins/**/*.js"),
  {ignoreInitial:true}
)

loadPlugins()

watcher.on("change",file=>{
  console.log("♻ reload",file)
  loadPlugins()
})

/* ================= API INFO ================= */

app.get('/api/info',(req,res)=>{

  res.json({
    status:true,
    server:"LIBIE API",
    version:pkg.version,
    total_endpoints:apiList.length,
    apis:apiList
  })

})

/* ================= REPORT ================= */

app.post('/api/user-report', async (req,res)=>{

  try{

    const {type,message,timestamp} = req.body

    const ip = getIP(req)
    const fingerprint = getFingerprint(req)

    const hash = `${fingerprint}:${message}`

    const exists = await redis.get(`report:${hash}`)

    if(exists){
      return res.json({
        status:false,
        message:"Duplicate report"
      })
    }

    await redis.set(`report:${hash}`,1,{EX:5})

    const payload = {
      type,
      message,
      ip,
      timestamp
    }

    await redis.publish(
      "reports",
      JSON.stringify(payload)
    )

    await redis.incr("stats:reports")

    res.json({
      status:true,
      message:"Report terkirim"
    })

  }catch(err){

    res.status(500).json({
      status:false,
      message:err.message
    })

  }

})

/* ================= LIMIT STATUS ================= */

app.get('/api/status/ip', async (req,res)=>{

  try{

    const fingerprint = getFingerprint(req)
    const ip = getIP(req)

    const key = `limit:month:${fingerprint}`

    const requests = Number(await redis.get(key)) || 0
    const ttl = await redis.ttl(key)

    const LIMIT = 1000

    res.json({
      status:true,
      ip,
      requests,
      remaining:Math.max(0,LIMIT - requests),
      blocked:requests >= LIMIT,
      reset_at: ttl>0 ? new Date(Date.now()+ttl*1000) : null
    })

  }catch{

    res.status(500).json({
      status:false,
      message:"Gagal membaca quota"
    })

  }

})

/* ================= SERVER STATS ================= */

app.get("/api/stats", async (req,res)=>{

  try{

    const today = new Date().toISOString().slice(0,10)

    const totalHitsAll = Number(await redis.get("stats:hits:all")) || 0
    const totalHitsToday = Number(await redis.get(`stats:hits:${today}`)) || 0
    const totalReports = Number(await redis.get("stats:reports")) || 0
    const activeUsers = await redis.sCard("stats:users")

    /* ================= SYSTEM ================= */

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    const memPercent = (usedMem / totalMem) * 100

    const cpus = os.cpus()
    const load = os.loadavg()[0]

    let cpuPercent = (load / cpus.length) * 100
    if(cpuPercent > 100) cpuPercent = 100

    /* ================= DISK ================= */

    const disk = execSync("df -h /")
      .toString()
      .split("\n")[1]
      .trim()
      .split(/\s+/)

    const diskPercent = parseFloat(disk[4].replace("%",""))

    res.json({

      generated_at:new Date(),

      server:{

        os:os.type(),
        kernel:os.release(),
        arch:os.arch(),
        hostname:os.hostname(),
        platform:os.platform(),
        uptime:Math.floor(os.uptime()/3600)+" hours",

        cpu:{
          model:cpus[0].model,
          cores:cpus.length,
          load_1m:load.toFixed(2),
          usage_percent:Number(cpuPercent.toFixed(1))
        },

        memory:{
          total_gb:(totalMem/1024/1024/1024).toFixed(2),
          used_gb:(usedMem/1024/1024/1024).toFixed(2),
          free_gb:(freeMem/1024/1024/1024).toFixed(2),
          usage_percent:Number(memPercent.toFixed(1))
        },

        disk:{
          total:disk[1],
          used:disk[2],
          free:disk[3],
          percent:diskPercent
        }

      },

      api:{
        total_endpoints:apiList.length,
        active_users:activeUsers,
        total_reports:totalReports,
        total_hits_today:totalHitsToday,
        total_hits_all:totalHitsAll
      }

    })

  }catch(err){

    console.error("Stats error",err)

    res.status(500).json({
      status:false,
      message:"Failed to read server stats"
    })

  }

})

/* ================= FRONTEND ================= */

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'))
})

app.get('/server',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','server.html'))
})

/* ================= 404 ================= */

app.use((req,res)=>{

  const acceptsHTML = req.headers.accept?.includes('text/html')

  if(acceptsHTML){
    return res.status(404).sendFile(
      path.join(__dirname,'public','404.html')
    )
  }

  res.status(404).json({
    status:false,
    message:"Endpoint tidak ditemukan"
  })

})

/* ================= START ================= */

app.listen(PORT,"0.0.0.0",async()=>{

  console.log("\n==============================")
  console.log("🚀 LIBIE API STARTED")
  console.log("==============================")

  console.log(`🌐 http://localhost:${PORT}`)
  console.log(`📚 /api/info`)

  try{
    const pong = await redis.ping()
    console.log(`🟥 Redis : ${pong}`)
  }catch{
    console.log(`🟥 Redis : OFFLINE`)
  }

  console.log("==============================\n")

})