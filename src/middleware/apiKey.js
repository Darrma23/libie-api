const env = require('../config/env')

function apiKeyMiddleware(req, res, next) {
  if (!env.API_KEY) return next()
  const provided = req.get('x-api-key') || req.query.api_key || ''
  if (provided === env.API_KEY) return next()
  return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Valid API key is required' })
}

module.exports = apiKeyMiddleware
