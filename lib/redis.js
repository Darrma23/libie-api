const { createClient } = require("redis");

const ENABLE_REDIS = process.env.ENABLE_REDIS === "true";

let redis = null;

if (ENABLE_REDIS) {
  redis = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });

  redis.on("connect", () => {
    console.log("🟢 Redis connected");
  });

  redis.on("error", (err) => {
    console.warn("🟡 Redis error:", err.message);
  });

  (async () => {
    try {
      await redis.connect();
    } catch (err) {
      console.warn("🟡 Failed to connect Redis:", err.message);
    }
  })();
} else {
  console.log("🟡 Redis disabled");
}

module.exports = redis;