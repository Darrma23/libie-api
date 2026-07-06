function buildSuccess(payload, meta = {}) {
  return {
    success: true,
    creator: meta.creator || 'Himejima',
    code: meta.code || 200,
    result: payload,
    execution_time: meta.execution_time || 0
  }
}

function buildError(message, error = null, code = 500) {
  return {
    success: false,
    error: error && typeof error === 'string' ? error : 'InternalServerError',
    message: message || 'Internal server error'
  }
}

module.exports = { buildSuccess, buildError }
