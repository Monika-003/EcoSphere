'use strict';

const Redis  = require('ioredis');
const { logger } = require('./logger');

let redisClient    = null;
let redisAvailable = false;

function createRedisClient() {
  const client = new Redis({
    host:          process.env.REDIS_HOST     || 'localhost',
    port:          parseInt(process.env.REDIS_PORT || '6379'),
    password:      process.env.REDIS_PASSWORD || undefined,
    db:            parseInt(process.env.REDIS_DB   || '0'),
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    enableReadyCheck: true,
    lazyConnect:   true,
    connectTimeout: 3000,
  });

  client.on('connect',      () => { redisAvailable = true;  logger.info('[Redis] Connected'); });
  client.on('ready',        () => { redisAvailable = true; });
  client.on('error',        (err) => { redisAvailable = false; logger.warn('[Redis] Unavailable:', err.message); });
  client.on('close',        () => { redisAvailable = false; logger.warn('[Redis] Connection closed'); });
  client.on('reconnecting', () => logger.info('[Redis] Reconnecting...'));

  return client;
}

async function connectRedis() {
  redisClient = createRedisClient();
  try {
    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch (err) {
    redisAvailable = false;
    logger.warn('[Redis] Could not connect — running without cache/blacklist (dev mode):', err.message);
    return null;
  }
}

function getRedis() {
  if (!redisClient || !redisAvailable) return null;
  return redisClient;
}

function isRedisAvailable() {
  return redisAvailable;
}

/* ── Cache helpers ── */
const CACHE_TTL = {
  SHORT:  300,       // 5 min
  MEDIUM: 1800,      // 30 min
  LONG:   86400,     // 24 hr
  WEEK:   604800,    // 7 days
};

async function cacheGet(key) {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function cacheSet(key, value, ttl = CACHE_TTL.MEDIUM) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.warn('[Redis] Cache set failed:', err.message);
  }
}

async function cacheDel(key) {
  const r = getRedis();
  if (!r) return;
  try { await r.del(key); } catch {}
}

async function cacheDelPattern(pattern) {
  const r = getRedis();
  if (!r) return;
  try {
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(...keys);
  } catch {}
}

async function cacheGetOrSet(key, fn, ttl = CACHE_TTL.MEDIUM) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const fresh = await fn();
  await cacheSet(key, fresh, ttl);
  return fresh;
}

/* ── Blacklist JWT (logout) — no-op if Redis unavailable ── */
async function blacklistToken(jti, expiresIn) {
  const r = getRedis();
  if (!r) return; // token still expires naturally
  try { await r.setex(`bl:${jti}`, expiresIn, '1'); } catch {}
}

async function isTokenBlacklisted(jti) {
  const r = getRedis();
  if (!r) return false; // assume not blacklisted if Redis is down
  try { return (await r.exists(`bl:${jti}`)) === 1; } catch { return false; }
}

/* ── Rate limit store ── */
async function incrWithTtl(key, ttl) {
  const r = getRedis();
  if (!r) return 0;
  try {
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, ttl);
    return count;
  } catch { return 0; }
}

module.exports = {
  connectRedis, getRedis, isRedisAvailable,
  cacheGet, cacheSet, cacheDel, cacheDelPattern, cacheGetOrSet,
  blacklistToken, isTokenBlacklisted,
  incrWithTtl,
  CACHE_TTL
};
