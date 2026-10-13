import crypto from "crypto";
import { getCacheClient } from "./cache.js";

/**
 * Distributed Lock using Redis (Redlock primitive: SET lockKey lockVal NX PX ttl)
 * Prevents race conditions across distributed microservices.
 */
export async function acquireLock(resourceKey, ttlMs = 5000) {
  const cache = getCacheClient();
  const lockVal = crypto.randomUUID();
  const lockKey = `lock:${resourceKey}`;

  try {
    // ioredis syntax: set(key, val, 'PX', ttlMs, 'NX')
    const result = await cache.set(lockKey, lockVal, "PX", ttlMs, "NX");
    if (result === "OK" || result === true) {
      return {
        acquired: true,
        lockKey,
        lockVal,
        release: async () => releaseLock(lockKey, lockVal),
      };
    }
  } catch (err) {
    console.warn(`[Lock] Failed to acquire lock for ${resourceKey}:`, err.message);
  }

  return { acquired: false, release: async () => {} };
}

/**
 * Safely releases lock only if the value still matches the lock owner.
 */
export async function releaseLock(lockKey, lockVal) {
  const cache = getCacheClient();
  try {
    const currentVal = await cache.get(lockKey);
    if (currentVal === lockVal) {
      await cache.del(lockKey);
    }
  } catch (err) {
    console.warn(`[Lock] Failed to release lock ${lockKey}:`, err.message);
  }
}

/**
 * Executes an async action wrapped in a distributed lock.
 */
export async function withLock(resourceKey, ttlMs, action) {
  const lock = await acquireLock(resourceKey, ttlMs);
  if (!lock.acquired) {
    throw new Error(`Conflict: Concurrent operation in progress for ${resourceKey}. Please try again.`);
  }

  try {
    return await action();
  } finally {
    await lock.release();
  }
}
