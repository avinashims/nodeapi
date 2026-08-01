const { getRedisClient, isRedisReady } = require("./redis");
const { cacheKeys } = require("./cacheKeys");

const DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL, 10) || 300;

function getTtl(override) {
  return typeof override === "number" && override > 0 ? override : DEFAULT_TTL;
}

function logCache(type, key) {
  if (process.env.CACHE_DEBUG === "false") return;
  console.log(type === "HIT" ? `[CACHE HIT] ${key}` : `[CACHE MISS → DB] ${key}`);
}

async function cacheGet(key) {
  if (!isRedisReady()) return null;
  try {
    const raw = await getRedisClient().get(key);
    if (!raw) return null;
    logCache("HIT", key);
    return JSON.parse(raw);
  } catch (err) {
    console.error("cacheGet error:", err.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  if (!isRedisReady()) return false;
  try {
    const payload = JSON.stringify(value);
    const ttl = getTtl(ttlSeconds);
    await getRedisClient().set(key, payload, { EX: ttl });
    if (process.env.CACHE_DEBUG !== "false") {
      console.log(`[CACHE SET] ${key} (expires in ${ttl}s)`);
    }
    return true;
  } catch (err) {
    console.error("cacheSet error:", err.message);
    return false;
  }
}

async function cacheDel(key) {
  if (!isRedisReady()) return false;
  try {
    await getRedisClient().del(key);
    return true;
  } catch (err) {
    console.error("cacheDel error:", err.message);
    return false;
  }
}

async function cacheDelByPattern(pattern) {
  if (!isRedisReady()) return false;
  try {
    const redis = getRedisClient();
    let deleted = 0;
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await redis.del(key);
      deleted += 1;
    }
    return deleted;
  } catch (err) {
    console.error("cacheDelByPattern error:", err.message);
    return false;
  }
}

async function invalidateProductCache(productId) {
  await cacheDelByPattern(cacheKeys.productsPattern());
  if (productId) {
    await cacheDel(cacheKeys.productById(productId));
  }
  await invalidateAdminDashboardCache();
}

async function invalidateDashboardCache(userId) {
  if (userId) {
    await cacheDel(cacheKeys.customerDashboard(userId));
  }
}

async function invalidateAdminDashboardCache() {
  await cacheDel(cacheKeys.adminDashboard());
}

async function invalidateOrderRelatedCache(userId) {
  await Promise.all([
    invalidateDashboardCache(userId),
    invalidateAdminDashboardCache(),
  ]);
}

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPattern,
  invalidateProductCache,
  invalidateDashboardCache,
  invalidateAdminDashboardCache,
  invalidateOrderRelatedCache,
  logCache,
};
