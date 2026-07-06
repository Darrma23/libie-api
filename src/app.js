const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const fileUpload = require('express-fileupload')
const chokidar = require('chokidar')
const os = require('os')

const env = require('./config/env')
const logger = require('./utils/logger')
const { buildError } = require('./utils/response')
const requestLogger = require('./middleware/requestLogger')
const apiKeyMiddleware = require('./middleware/apiKey')
const sanitizeInput = require('./middleware/sanitizeInput')
const { validatePluginParams } = require('./middleware/validation')
const cache = require('./services/cache')
const PluginRegistry = require('./services/pluginRegistry')
const systemRoutes = require('./routes/system')
const { ipLimiter } = require('../lib/iplimiter')

function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.set('json spaces', 2)
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(cors())
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  app.use(requestLogger)
  app.use(sanitizeInput)

  app.use(express.json({ limit: env.REQUEST_SIZE_LIMIT }))
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_SIZE_LIMIT }))
  app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: { success: false, message: 'File terlalu besar (max 10MB)' }
  }))

  app.use('/files', express.static(path.join(process.cwd(), 'files')))
  app.use(express.static(path.join(process.cwd(), 'public')))

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(buildError('Too many requests', 'RateLimitExceeded', 429))
    }
  })

  app.use('/api', limiter)
  app.use('/api', ipLimiter)
  app.use('/api', apiKeyMiddleware)

  app.use(systemRoutes)
  app.use('/api', systemRoutes)

  const pluginsDir = path.join(process.cwd(), 'plugins')
  const registry = new PluginRegistry({ pluginsDir })
  const watcher = env.ENABLE_HOT_RELOAD ? chokidar.watch(path.join(pluginsDir, '**/*.js'), { ignoreInitial: true }) : null

  const pluginRouter = express.Router()
  app.use('/api', pluginRouter)

  const registerPluginRoutes = async () => {
    const { count, errors } = await registry.loadAll({ hotReload: env.ENABLE_HOT_RELOAD, watcher })
    pluginRouter.stack = []

    for (const plugin of registry.getSnapshot()) {
      if (plugin.disabled) continue
      const fullPath = `/${plugin.routeCategory}/${plugin.path.replace(/^\//, '')}`.replace(/\/+/g, '/')
      const routePath = `/api${fullPath}`

      pluginRouter[plugin.method](fullPath, async (req, res) => {
        const startedAt = Date.now()
        const validationErrors = validatePluginParams(plugin, req)

        if (validationErrors.length) {
          return res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: 'Validation failed',
            details: validationErrors
          })
        }

        const cacheKey = `plugin:${plugin.method}:${req.originalUrl}`
        if (req.method.toLowerCase() === 'get') {
          const cached = cache.get(cacheKey)
          if (cached) {
            return res.json(cached)
          }
        }

        const originalJson = res.json.bind(res)
        res.json = (body) => {
          if (body && typeof body === 'object' && !Buffer.isBuffer(body) && !Array.isArray(body)) {
            if (body.success !== undefined) {
              return originalJson(body)
            }
            if (body.status === false) {
              return originalJson(buildError(body.message || 'Plugin execution failed', body.error || 'PluginError', res.statusCode || 500))
            }
            const duration = Date.now() - startedAt
            return originalJson({
              success: true,
              creator: env.CREATOR,
              code: res.statusCode || 200,
              result: body,
              execution_time: `${duration}ms`
            })
          }
          const duration = Date.now() - startedAt
          return originalJson({
            success: true,
            creator: env.CREATOR,
            code: res.statusCode || 200,
            result: body,
            execution_time: `${duration}ms`
          })
        }

        try {
          const result = await plugin.execute(req, res)
          if (res.headersSent) return
          const duration = Date.now() - startedAt
          const payload = {
            success: true,
            creator: env.CREATOR,
            code: 200,
            result,
            execution_time: `${duration}ms`
          }
          if (req.method.toLowerCase() === 'get') {
            cache.set(cacheKey, payload, 60_000)
          }
          res.json(payload)
        } catch (error) {
          logger.error('Plugin execution failed', { plugin: plugin.name, message: error.message })
          if (!res.headersSent) {
            res.status(error.statusCode || 500).json(buildError(error.message || 'Plugin execution failed', error.name || 'PluginError', error.statusCode || 500))
          }
        }
      })
      logger.info('Plugin route loaded', { method: plugin.method.toUpperCase(), path: routePath })
    }

    if (errors.length) {
      logger.warn('Plugin load errors', { count: errors.length, errors })
    }
  }

  app.get('/api/plugins', (req, res) => {
    const list = registry.getSnapshot().map((plugin) => ({
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      method: plugin.method.toUpperCase(),
      path: `/api/${plugin.sourceCategory}/${plugin.path.replace(/^\//, '')}`,
      aliases: plugin.aliases
    }))
    res.json({ success: true, creator: env.CREATOR, code: 200, result: { plugins: list, count: list.length }, execution_time: '0ms' })
  })

  app.get('/api/plugins/:pluginName', (req, res) => {
    const plugin = registry.getPlugin(req.params.pluginName)
    if (!plugin) {
      return res.status(404).json(buildError('Plugin not found', 'NotFound', 404))
    }

    res.json({
      success: true,
      creator: env.CREATOR,
      code: 200,
      result: {
        name: plugin.name,
        category: plugin.category,
        description: plugin.description,
        method: plugin.method.toUpperCase(),
        path: `/api/${plugin.routeCategory}/${plugin.path.replace(/^\//, '')}`,
        aliases: plugin.aliases,
        params: plugin.params
      },
      execution_time: '0ms'
    })
  })

  app.post('/api/plugins/reload', async (req, res) => {
    try {
      await registerPluginRoutes()
      res.json({ success: true, creator: env.CREATOR, code: 200, result: { reloaded: true }, execution_time: '0ms' })
    } catch (error) {
      res.status(500).json(buildError('Plugin reload failed', error.message, 500))
    }
  })

  app.use((req, res) => {
    res.status(404).json(buildError('Route not found', 'NotFound', 404))
  })

  app.use((error, req, res, next) => {
    logger.error('Unhandled error', { message: error.message })
    res.status(error.statusCode || 500).json(buildError('Internal server error', 'InternalServerError', error.statusCode || 500))
  })

  registerPluginRoutes().catch((error) => logger.error('Initial plugin load failed', { message: error.message }))

  return app
}

module.exports = { createApp }
