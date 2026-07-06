const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function colorize(level, message) {
  const map = {
    info: colors.cyan,
    warn: colors.yellow,
    error: colors.red,
    success: colors.green,
    debug: colors.magenta
  }
  return `${map[level] || colors.white}${message}${colors.reset}`
}

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const details = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  console.log(`[${timestamp}] ${colorize(level, level.toUpperCase())} ${message}${details}`)
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  success: (message, meta) => log('success', message, meta),
  debug: (message, meta) => log('debug', message, meta)
}
