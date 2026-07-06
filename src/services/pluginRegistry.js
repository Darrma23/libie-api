const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const logger = require('../utils/logger')
const { buildError } = require('../utils/response')

class PluginRegistry {

scanPluginFiles(dir) {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...this.scanPluginFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }

  return results;
}

  constructor({ pluginsDir }) {
    this.pluginsDir = pluginsDir
    this.registry = new Map()
    this.categories = new Set()
    this.aliases = new Map()
    this.loadErrors = []
    this.duplicates = []
  }

  getSnapshot() {
    return Array.from(this.registry.values())
  }

  getPlugin(name) {
    return this.registry.get(name) || this.registry.get(this.aliases.get(name)) || null
  }

  async loadAll({ hotReload = false, watcher = null } = {}) {
    this.registry.clear()
    this.categories.clear()
    this.aliases.clear()
    this.loadErrors = []
    this.duplicates = []

    if (!fs.existsSync(this.pluginsDir)) {
      return { count: 0, errors: [] }
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            this.categories.add(entry.name);
        }
    }

    const pluginFiles = this.scanPluginFiles(this.pluginsDir);

    for (const filePath of pluginFiles) {
      try {
        const plugin = this.loadOne(filePath)
        if (!plugin) continue

        if (this.registry.has(plugin.name)) {
          this.duplicates.push({ name: plugin.name, filePath })
          logger.warn('Duplicate plugin name detected', { name: plugin.name, filePath })
          continue
        }

        this.registry.set(plugin.name, plugin)
        this.aliases.set(plugin.name.toLowerCase(), plugin.name)
        if (Array.isArray(plugin.aliases)) {
          for (const alias of plugin.aliases) {
            this.aliases.set(alias.toLowerCase(), plugin.name)
          }
        }
      } catch (error) {
        this.loadErrors.push({ filePath, message: error.message })
        logger.error('Plugin failed', { filePath, message: error.message })
      }
    }

    if (hotReload && watcher) {
      watcher.on('change', (filePath) => {
        if (!filePath.endsWith('.js')) return
        try {
          delete require.cache[require.resolve(filePath)]
          this.loadAll({ hotReload: false })
          logger.info('Plugin reloaded', { filePath })
        } catch (error) {
          logger.error('Plugin reload failed', { filePath, message: error.message })
        }
      })
    }

    logger.success('Plugins loaded', { count: this.registry.size })
    return { count: this.registry.size, errors: this.loadErrors }
  }

  loadOne(filePath) {
    delete require.cache[require.resolve(filePath)]
    const loaded = require(filePath)
    const plugin = loaded && loaded.default ? loaded.default : loaded

    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin module is invalid')
    }

    const name = plugin.name || path.basename(filePath, '.js')
    const category = plugin.category || path.basename(path.dirname(filePath))
    const relativePath = path.relative(this.pluginsDir, filePath)
    const pathSegments = relativePath.split(path.sep)
    const topLevelCategory = pathSegments.length > 1 ? pathSegments[0].toLowerCase() : (category || 'root').toLowerCase()
    const method = (plugin.method || 'get').toLowerCase()

    if (plugin.disabled) {
      return null
    }

    if (!plugin.execute && typeof plugin.run !== 'function') {
      throw new Error('Plugin must expose execute or run')
    }

    const allowedMethods = ['get', 'post', 'put', 'delete', 'patch']
    if (!allowedMethods.includes(method)) {
      throw new Error(`Unsupported HTTP method: ${method}`)
    }

    const normalized = {
      id: crypto.createHash('sha1').update(filePath).digest('hex').slice(0, 12),
      name,
      category,
      routeCategory: topLevelCategory,
      description: plugin.description || plugin.desc || '',
      version: plugin.version || '1.0.0',
      author: plugin.author || 'unknown',
      path: plugin.path || `/${name.toLowerCase().replace(/\s+/g, '-')}`,
      method,
      sourceCategory: topLevelCategory,
      aliases: Array.isArray(plugin.aliases) ? plugin.aliases : [],
      tags: Array.isArray(plugin.tags) ? plugin.tags : [],
      disabled: Boolean(plugin.disabled),
      filePath,
      execute: plugin.execute || plugin.run,
      params: Array.isArray(plugin.params) ? plugin.params : [],
      example: plugin.example || ''
    }

    return normalized
  }
}

module.exports = PluginRegistry
