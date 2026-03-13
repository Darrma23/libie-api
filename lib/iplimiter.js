const redis = require('./redis')
const crypto = require('crypto')

const BURST_LIMIT = 10
const BURST_WINDOW = 1

const MONTH_LIMIT = 1000
const MONTH_WINDOW = 30 * 24 * 60 * 60

function getIP(req) {

  let ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    req.socket.remoteAddress

  if (ip && ip.includes(',')) ip = ip.split(',')[0]

  return String(ip)
    .replace(/^::ffff:/, '')
    .replace(/^::1$/, '127.0.0.1')
    .trim()
}

function getFingerprint(req) {

  const ip = getIP(req)
  const ua = req.headers['user-agent'] || ''

  return crypto
    .createHash("sha1")
    .update(ip + ua)
    .digest("hex")
}

async function increment(key, window) {

  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, window)
  }

  return count
}

async function ipLimiter(req, res, next) {

  if (!req.originalUrl.startsWith('/api')) return next()

  const endpoint = req.originalUrl

  if (
    endpoint.startsWith('/api/status') ||
    endpoint.startsWith('/api/info') ||
    endpoint.startsWith('/api/ping')
  ) {
    return next()
  }

  try {

    const fingerprint = getFingerprint(req)

    const burstKey = `limit:burst:${fingerprint}`
    const monthKey = `limit:month:${fingerprint}`

    const burst = await increment(burstKey, BURST_WINDOW)

    if (burst > BURST_LIMIT) {
      return res.status(429).json({
        status:false,
        message:"Terlalu banyak request"
      })
    }

    const month = await increment(monthKey, MONTH_WINDOW)

    if (month > MONTH_LIMIT) {
      return res.status(429).json({
        status:false,
        message:"Limit bulanan tercapai"
      })
    }

    next()

  } catch (err) {

    console.error("Limiter error:", err.message)
    next()

  }
}

module.exports = { ipLimiter, getIP, getFingerprint }