class MemoryCache {
  constructor() {
    this.store = new Map()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  set(key, value, ttlMs = 60_000) {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    })
  }

  delete(key) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

module.exports = new MemoryCache()
