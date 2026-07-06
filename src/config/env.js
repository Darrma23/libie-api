const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  CREATOR: process.env.CREATOR || 'Himejima',
  API_KEY: process.env.API_KEY || '',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120),
  REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT || '5mb',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  ENABLE_REDIS: process.env.ENABLE_REDIS !== 'false',
  ENABLE_HOT_RELOAD: process.env.ENABLE_HOT_RELOAD !== 'false'
}

module.exports = env
