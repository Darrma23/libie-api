function validatePluginParams(plugin, req) {
  const errors = []
  const params = Array.isArray(plugin.params) ? plugin.params : []

  for (const param of params) {
    const source = req[param.type] || {}
    const value = source[param.name]
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push(`${param.name} is required`)
      continue
    }

    if (value === undefined || value === null || value === '') continue

    const dtype = (param.dtype || 'string').toLowerCase()
    switch (dtype) {
      case 'number':
        if (Number.isNaN(Number(value))) errors.push(`${param.name} must be a number`)
        break
      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(String(value).toLowerCase())) errors.push(`${param.name} must be a boolean`)
        break
      case 'array':
        if (!Array.isArray(value)) errors.push(`${param.name} must be an array`)
        break
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) errors.push(`${param.name} must be an object`)
        break
      default:
        break
    }
  }

  return errors
}

module.exports = { validatePluginParams }
