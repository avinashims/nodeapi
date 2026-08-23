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
  if (!isRedisReady()) return 0;
  try {
    const redis = getRedisClient();
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (!keys.length) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch (err) {
    console.error("cacheDelByPattern error:", err.message);
    return 0;
  }
}

async function getProductCacheVersion() {
  if (!isRedisReady()) return 1;
  try {
    const redis = getRedisClient();
    const existing = await redis.get(cacheKeys.productsVersion());
    if (existing) {
      const parsed = parseInt(existing, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    await redis.set(cacheKeys.productsVersion(), "1", { NX: true });
    return 1;
  } catch (err) {
    console.error("getProductCacheVersion error:", err.message);
    return 1;
  }
}

async function bumpProductCacheVersion() {
  if (!isRedisReady()) return 1;
  try {
    return await getRedisClient().incr(cacheKeys.productsVersion());
  } catch (err) {
    console.error("bumpProductCacheVersion error:", err.message);
    return 1;
  }
}

async function productsListCacheKey(page, limit, search, categoryId) {
  const version = await getProductCacheVersion();
  return cacheKeys.productsList(version, page, limit, search, categoryId);
}

async function productByIdCacheKey(productId) {
  const version = await getProductCacheVersion();
  return cacheKeys.productById(version, productId);
}

async function invalidateProductCache(productId) {
  const version = await bumpProductCacheVersion();
  const deleted = await cacheDelByPattern(cacheKeys.productsPattern());
  if (process.env.CACHE_DEBUG !== "false") {
    console.log(
      `[CACHE INVALIDATE] products version=${version} deleted=${deleted}` +
        (productId ? ` productId=${productId}` : "")
    );
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
  productsListCacheKey,
  productByIdCacheKey,
  invalidateProductCache,
  invalidateDashboardCache,
  invalidateAdminDashboardCache,
  invalidateOrderRelatedCache,
  logCache,
};
