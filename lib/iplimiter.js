const redis = require('./redis');

const LIMIT = 1000;
const WINDOW = 30 * 24 * 60 * 60;

function getIP(req) {
  const ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    req.ip

  return String(ip).replace(/^::ffff:/, '').trim()
}

async function ipLimiter(req, res, next) {
  if (!req.originalUrl.startsWith('/api')) return next();

  const ip = getIP(req);
  const endpoint = req.path

  /* 🚫 Bebas quota */
  if (
    endpoint === '/api/status/ip' ||
    endpoint === '/api/health' ||
    endpoint === '/api/ping' ||
    endpoint === '/api/info'
  ) {
    return next();
  }

  try {
    const key = `quota:${ip}`;
    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, WINDOW);
    }

    if (requests > LIMIT) {
      return res.status(429).json({
        status: false,
        message: 'Limit bulanan tercapai'
      });
    }

    next();

  } catch (err) {
    console.error('Limiter Redis error:', err.message);
    next();
  }
}

module.exports = { ipLimiter, getIP, LIMIT };