const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const PluginRegistry = require('../src/services/pluginRegistry')

test('loads plugins from nested directories and respects metadata', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'libie-plugin-tests-'))
  const pluginsDir = path.join(tempRoot, 'plugins')

  fs.mkdirSync(path.join(pluginsDir, 'info', 'nested'), { recursive: true })
  fs.mkdirSync(path.join(pluginsDir, 'tools'), { recursive: true })

  fs.writeFileSync(
    path.join(pluginsDir, 'info', 'nested', 'sample.js'),
    `module.exports = { name: 'Nested Sample', description: 'Nested plugin', category: 'info', method: 'GET', path: '/nested', aliases: ['sample'], execute() { return { ok: true } } }`
  )

  fs.writeFileSync(
    path.join(pluginsDir, 'tools', 'disabled.js'),
    `module.exports = { name: 'Disabled Sample', description: 'Disabled plugin', category: 'tools', method: 'GET', path: '/disabled', disabled: true, execute() { return { ok: true } } }`
  )

  const registry = new PluginRegistry({ pluginsDir })
  const result = await registry.loadAll()

  assert.equal(result.count, 1)
  assert.equal(result.errors.length, 0)

  const plugin = registry.getPlugin('Nested Sample')
  assert.ok(plugin)
  assert.equal(plugin.routeCategory, 'info')
  assert.deepEqual(plugin.aliases, ['sample'])
})
