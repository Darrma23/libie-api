const { createApp } = require('./app')
const env = require('./config/env')
const logger = require('./utils/logger')

const app = createApp()
const server = app.listen(env.PORT, () => {
  logger.success('Server started', { port: env.PORT, env: env.NODE_ENV })
})

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
