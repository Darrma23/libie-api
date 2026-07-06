function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '').trim()
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]))
  }
  return value
}

function sanitizeInput(req, res, next) {
  if (req.query) req.query = sanitizeValue(req.query)
  if (req.body) req.body = sanitizeValue(req.body)
  if (req.params) req.params = sanitizeValue(req.params)
  if (req.headers) req.headers = sanitizeValue(req.headers)
  next()
}

module.exports = sanitizeInput
