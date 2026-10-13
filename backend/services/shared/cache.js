import Redis from "ioredis";

// Memory cache fallback when Redis is not running locally
class MemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, durationSeconds) {
    this.store.set(key, value);
    if (mode === "EX" && durationSeconds) {
      this.ttls.set(key, Date.now() + durationSeconds * 1000);
    }
    return "OK";
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      this.ttls.delete(key);
    }
    return count;
  }

  async keys(pattern) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }
}

let redisClient = null;
let isConnected = false;
const fallbackCache = new MemoryCache();

export function getCacheClient() {
  if (redisClient) return redisClient;

  const redisUri = process.env.REDIS_URI;
  if (redisUri) {
    try {
      redisClient = new Redis(redisUri, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
      });

      redisClient.connect().then(() => {
        isConnected = true;
        console.log(" Connected to Redis Cache");
      }).catch((err) => {
        console.warn("⚠️ Redis connection failed. Falling back to in-memory cache:", err.message);
        isConnected = false;
      });

      redisClient.on("error", (err) => {
        if (isConnected) console.warn("Redis error:", err.message);
        isConnected = false;
      });

      redisClient.on("ready", () => {
        isConnected = true;
      });
    } catch (e) {
      console.warn("Redis setup error, using in-memory fallback:", e.message);
    }
  }

  // Wrapper providing uniform interface with transparent fallback
  return {
    async get(key) {
      if (isConnected && redisClient) {
        try { return await redisClient.get(key); } catch (e) {}
      }
      return await fallbackCache.get(key);
    },
    async set(key, value, mode, durationSeconds) {
      if (isConnected && redisClient) {
        try { return await redisClient.set(key, value, mode, durationSeconds); } catch (e) {}
      }
      return await fallbackCache.set(key, value, mode, durationSeconds);
    },
    async del(...keys) {
      if (isConnected && redisClient) {
        try { return await redisClient.del(...keys); } catch (e) {}
      }
      return await fallbackCache.del(...keys);
    },
    async keys(pattern) {
      if (isConnected && redisClient) {
        try { return await redisClient.keys(pattern); } catch (e) {}
      }
      return await fallbackCache.keys(pattern);
    }
  };
}
