const express = require('express')
const os = require('os')
const { buildSuccess, buildError } = require('../utils/response')
const logger = require('../utils/logger')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json(buildSuccess({ status: 'ok', uptime: process.uptime() }))
})

router.get('/stats', (req, res) => {
  res.json(buildSuccess({
    memory: process.memoryUsage(),
    cpu: os.loadavg(),
    platform: process.platform,
    nodeVersion: process.version
  }))
})

router.get('/version', (req, res) => {
  const pkg = require('../../package.json')
  res.json(buildSuccess({ version: pkg.version, name: pkg.name }))
})

router.get('/uptime', (req, res) => {
  res.json(buildSuccess({ uptime: process.uptime(), startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() }))
})

module.exports = router
