const redis = require('./redis')
const crypto = require('crypto')

const MONTH_LIMIT = 1000
const MONTH_WINDOW = 30 * 24 * 60 * 60

function getIP(req){

  let ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    req.socket.remoteAddress

  if(ip && ip.includes(',')) ip = ip.split(',')[0].trim()

  return String(ip)
    .replace(/^::ffff:/,'')
    .replace(/^::1$/,'127.0.0.1')
}

function getFingerprint(req){

  const ip = getIP(req)
  const ua = req.headers['user-agent'] || ''
  const lang = req.headers['accept-language'] || ''

  return crypto
    .createHash("sha1")
    .update(ip + ua + lang)
    .digest("hex")
}

async function ipLimiter(req,res,next){

  if(!req.originalUrl.startsWith('/api')){
    return next()
  }

  const path = req.path

  if(
    path.startsWith('/api/info') ||
    path.startsWith('/api/status') ||
    path.startsWith('/api/ping')
  ){
    return next()
  }

  try{

    const fingerprint = getFingerprint(req)

    const key = `limit:month:${fingerprint}`

    const count = await redis.incr(key)

    if(count === 1){
      await redis.expire(key,MONTH_WINDOW)
    }

    if(count > MONTH_LIMIT){
      return res.status(429).json({
        status:false,
        message:"Limit bulanan tercapai"
      })
    }

    next()

  }catch(err){

    console.error("Limiter error:",err.message)
    next()

  }

}

module.exports = {
  ipLimiter,
  getIP,
  getFingerprint
}