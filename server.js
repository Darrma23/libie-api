require('dotenv').config();
const pkg = require('./package.json');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const os = require('os');
const { execSync } = require('child_process');
const chokidar = require("chokidar");
const helmet = require("helmet");

const { ipLimiter, getIP, LIMIT } = require('./lib/iplimiter');
const redis = require('./lib/redis');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('json spaces', 2);

const CREATOR = "Himejima";

/* ================= CLEAN STRING ================= */

function clean(str) {
  return String(str || '')
    .replace(/[<>"']/g, '')
    .trim();
}

/* ================= CATEGORY PREFIX ================= */

const CATEGORY_PREFIX = {
  downloader: "/download",
  tools: "/tools",
  random: "/random",
  info: "/info",
  games: "/games",
  admin: "/admin",
  search: "/search",
  maker: "/maker",
  threads: "/threads",
  instagram: "/instagram",
  tiktok: "/tiktok",
  music: "/music",
  image: "/image",
  ai: "/ai",
  social: "/social",
  media: "/media",
  news: "/news",
  weather: "/weather",
  finance: "/finance",
  anime: "/anime",
  internet: "/internet",
  storage: "/storage"
};

function resolvePrefix(category) {
  return CATEGORY_PREFIX[String(category).toLowerCase()] || '/other';
}

/* ================= BURST LIMITER ================= */

const limiter = rateLimit({
  windowMs: 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIP(req),
  message: {
    status: false,
    message: "Terlalu banyak request"
  }
});

/* ================= GLOBAL MIDDLEWARE ================= */

app.use(helmet());
app.disable("x-powered-by");
app.use('/api', limiter);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended:true, limit:"3mb" }));

app.use(express.static(path.join(__dirname,'public')));
app.use('/files', express.static(path.join(process.cwd(),'files')));

app.use(ipLimiter);

app.use((req,res,next)=>{
  const original = res.json;

  res.json = function(body){
    if(body && typeof body === "object" && !Buffer.isBuffer(body)){
      body.creator = CREATOR;
    }
    return original.call(this, body);
  };

  next();
});

/* ================= FILE UPLOAD ================= */

const fileUpload = require("express-fileupload");

app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true,
  responseOnLimit: {
    status:false,
    message:"File terlalu besar (max 10MB)"
  }
}));

/* ================= PLUGIN ROUTER ================= */

let pluginRouter = express.Router();
app.use('/api', pluginRouter);

const loadedPlugins = new Map();

let count = 0;
let apiList = [];

/* ================= LOAD ALL PLUGINS ================= */

function loadPlugins(){

  pluginRouter.stack = [];

  const pluginsDir = path.join(__dirname,"plugins");
  let registeredCount = 0;
  
  apiList = [];

  if(!fs.existsSync(pluginsDir)){
    return {count:0,list:[]};
  }

  const categories = fs.readdirSync(pluginsDir).filter(file =>
    fs.statSync(path.join(pluginsDir,file)).isDirectory()
  );

  categories.forEach(category=>{

    const categoryPath = path.join(pluginsDir,category);
    const files = fs.readdirSync(categoryPath).filter(f=>f.endsWith(".js"));

    files.forEach(file=>{

      const filePath = path.join(categoryPath,file);
      if (require.cache[require.resolve(filePath)]) {
        delete require.cache[require.resolve(filePath)];
      }
      
      let plugin;
      
      try {
        plugin = require(filePath);
      } catch (err) {
        console.error(`✖ Gagal load ${file}`, err.message);
        return;
      }
      
      if(!plugin.name || !plugin.method || !plugin.path || typeof plugin.run !== "function"){
        console.error(`✖ Plugin ${file} tidak valid`);
        return;
      }

      const method = plugin.method.toLowerCase();
      const basePath = plugin.path.startsWith('/') ? plugin.path : '/' + plugin.path;

      const prefix = resolvePrefix(plugin.category || category);
      const fullPath = `${prefix}${basePath}`.replace(/\/+/g,'/');

      const handler = async(req,res)=>{
        try{
          await plugin.run(req,res);
        }catch(err){
          res.status(500).json({
            status:false,
            message:err.message
          });
        }
      };

      pluginRouter[method](fullPath,handler);

      loadedPlugins.set(filePath,{
        name: plugin.name,
        desc: plugin.desc,
        category: plugin.category || category,
        method,
        fullPath,
        handler
      });

      registeredCount++;

      apiList.push({
        nama:plugin.name,
        deskripsi:plugin.desc,
        kategori:plugin.category || category,
        method:plugin.method.toUpperCase(),
        endpoint:`/api${fullPath}`
      });

      console.log(`✔ ${method.toUpperCase()} /api${fullPath}`);

    });

  });

  return { count: registeredCount, list: apiList };
}

/* ================= REMOVE PLUGIN ================= */

function removePluginRoute(filePath){

  const plugin = loadedPlugins.get(filePath);
  if(!plugin) return;

  const {method,fullPath} = plugin;

  pluginRouter.stack = pluginRouter.stack.filter(layer=>{
    if(!layer.route) return true;

    const routePath = layer.route.path;
    const routeMethod = Object.keys(layer.route.methods)[0];

    return !(routePath === fullPath && routeMethod === method.toLowerCase());
  });

  loadedPlugins.delete(filePath);
}

/* ================= SINGLE RELOAD ================= */

function loadSinglePlugin(filePath){

  try{

    if (require.cache[require.resolve(filePath)]) {
     delete require.cache[require.resolve(filePath)];
   }

    const plugin = require(filePath);

    const method = plugin.method.toLowerCase();
    const basePath = plugin.path.startsWith('/') ? plugin.path : '/' + plugin.path;

    const category = plugin.category || path.basename(path.dirname(filePath));
    const prefix = resolvePrefix(category);
    const fullPath = `${prefix}${basePath}`.replace(/\/+/g,'/');

    const handler = async(req,res)=>{
      try{
        await plugin.run(req,res);
      }catch(err){
        res.status(500).json({
          status:false,
          message:err.message
        });
      }
    };

    pluginRouter[method](fullPath,handler);

    loadedPlugins.set(filePath,{
     name: plugin.name,
     desc: plugin.desc,
     category: plugin.category || category,
     method,
     fullPath,
     handler
   });

    console.log(`✔ Reloaded ${method.toUpperCase()} /api${fullPath}`);

  }catch(err){
    console.error(`✖ Reload error ${filePath}`,err.message);
  }

}

/* ================= WATCHER ================= */

const watcher = chokidar.watch(
  path.join(__dirname,"plugins/**/*.js"),
  {ignoreInitial:true,persistent:true}
);

const result = loadPlugins();
count = result.count;
apiList = result.list;

let reloadTimer;

watcher.on("all",(event,filePath)=>{

  if(!filePath.endsWith(".js")) return;

  console.log(`♻ Plugin event: ${event} ${filePath}`);

  clearTimeout(reloadTimer);

  reloadTimer = setTimeout(() => {

    if (event === "change" || event === "add") {
      removePluginRoute(filePath);
      loadSinglePlugin(filePath);
    }

    if (event === "unlink") {
      removePluginRoute(filePath);
      console.log(`🗑 Plugin removed: ${filePath}`);
    }

    // update registry saja
    apiList = Array.from(loadedPlugins.values()).map(p => ({
     nama: p.name,
     deskripsi: p.desc,
     kategori: p.category,
     method: p.method.toUpperCase(),
     endpoint: `/api${p.fullPath}`
   }));

    count = loadedPlugins.size;

  }, 200);

});

/* ================= API INFO ================= */

app.get('/api/info',(req,res)=>{

  res.json({
    status:true,
    server:"LIBIE API",
    version:pkg.version,
    total_endpoints:apiList.length,
    endpoint_categories:[...new Set(apiList.map(a=>a.kategori))],
    apis:apiList
  });

});

/* ================= STATUS IP ================= */

app.get('/api/status/ip',async(req,res)=>{

  try{

    const ip = getIP(req);
    const key = `quota:${ip}`;

    const requests = Number(await redis.get(key)) || 0;
    const ttl = await redis.ttl(key);

    res.json({
      status:true,
      ip,
      requests,
      remaining:Math.max(0,LIMIT - requests),
      blocked:requests >= LIMIT,
      reset_at: ttl > 0 ? new Date(Date.now() + ttl*1000) : null
    });

  }catch(err){

    res.status(500).json({
      status:false,
      message:"Gagal membaca quota"
    });

  }

});

/* ================= FRONTEND ================= */

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

/* ================= 404 ================= */

app.use((req,res)=>{

  const acceptsHTML = req.headers.accept?.includes('text/html');

  if(acceptsHTML){
    return res.status(404).sendFile(
      path.join(__dirname,'public','404.html')
    );
  }

  res.status(404).json({
    status:false,
    message:"Endpoint tidak ditemukan",
    requested_url:req.originalUrl,
    method:req.method,
    available_endpoints:"/api/info"
  });

});

/* ================= ERROR HANDLER ================= */

app.use((err,req,res,next)=>{

  console.error("🔥 Global Error:",err.stack);

  res.status(500).json({
    status:false,
    message:err.message
  });

});

/* ================= START ================= */

app.listen(PORT,"0.0.0.0",async()=>{

  console.log("\n==============================");
  console.log("🚀 LIBIE API STARTED");
  console.log("==============================");

  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📚 /api/info`);

  console.log(`📊 Total Plugin : ${count}`);

  try{
    const pong = await redis.ping();
    console.log(`🟥 Redis : ${pong}`);
  }catch(err){
    console.log(`🟥 Redis : OFFLINE`);
  }

  console.log("==============================\n");

});