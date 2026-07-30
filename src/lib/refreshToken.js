const crypto = require("crypto");
const { getRedisClient, isRedisReady } = require("./redis");
const { AppError } = require("./errors");

const REFRESH_PREFIX = "ecom:refresh:";
const REVOKED_PREFIX = "ecom:refresh:revoked:";
const FAMILY_PREFIX = "ecom:refresh:family:";
const USER_TOKENS_PREFIX = "ecom:user:refresh:";

function requireRedis() {
  if (!isRedisReady()) {
    throw new AppError("Authentication service unavailable (Redis required)", 503, "REDIS_UNAVAILABLE");
  }
  return getRedisClient();
}

function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function buildRefreshTokenValue(tokenId, secret) {
  return `${tokenId}.${secret}`;
}

function parseRefreshTokenValue(value) {
  if (!value || typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const tokenId = value.slice(0, dot);
  const secret = value.slice(dot + 1);
  if (!tokenId || !secret) return null;
  return { tokenId, secret };
}

async function storeRefreshToken({ userId, familyId, tokenId, secret, ttlSeconds }) {
  const redis = requireRedis();
  const payload = JSON.stringify({
    userId,
    familyId,
    secretHash: hashSecret(secret),
  });

  const pipeline = redis.multi();
  pipeline.setEx(`${REFRESH_PREFIX}${tokenId}`, ttlSeconds, payload);
  pipeline.setEx(`${FAMILY_PREFIX}${familyId}`, ttlSeconds, tokenId);
  pipeline.sAdd(`${USER_TOKENS_PREFIX}${userId}`, tokenId);
  pipeline.expire(`${USER_TOKENS_PREFIX}${userId}`, ttlSeconds);
  await pipeline.exec();
}

async function createRefreshToken(userId, ttlSeconds, existingFamilyId = null) {
  const tokenId = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("base64url");
  const familyId = existingFamilyId || crypto.randomUUID();

  await storeRefreshToken({ userId, familyId, tokenId, secret, ttlSeconds });

  return {
    refreshToken: buildRefreshTokenValue(tokenId, secret),
    tokenId,
    familyId,
  };
}

async function revokeTokenId(tokenId, userId) {
  const redis = requireRedis();
  const pipeline = redis.multi();
  pipeline.del(`${REFRESH_PREFIX}${tokenId}`);
  pipeline.sRem(`${USER_TOKENS_PREFIX}${userId}`, tokenId);
  await pipeline.exec();
}

async function revokeFamily(familyId, userId) {
  const redis = requireRedis();
  const tokenId = await redis.get(`${FAMILY_PREFIX}${familyId}`);
  const pipeline = redis.multi();
  pipeline.del(`${FAMILY_PREFIX}${familyId}`);
  if (tokenId) {
    pipeline.del(`${REFRESH_PREFIX}${tokenId}`);
    pipeline.sRem(`${USER_TOKENS_PREFIX}${userId}`, tokenId);
  }
  await pipeline.exec();
}

async function revokeAllUserTokens(userId) {
  const redis = requireRedis();
  const tokenIds = await redis.sMembers(`${USER_TOKENS_PREFIX}${userId}`);
  if (!tokenIds.length) return;

  for (const tokenId of tokenIds) {
    const stored = await redis.get(`${REFRESH_PREFIX}${tokenId}`);
    if (stored) {
      const data = JSON.parse(stored);
      await redis.del(`${FAMILY_PREFIX}${data.familyId}`);
    }
    await redis.del(`${REFRESH_PREFIX}${tokenId}`);
    await redis.del(`${REVOKED_PREFIX}${tokenId}`);
  }
  await redis.del(`${USER_TOKENS_PREFIX}${userId}`);
}

async function rotateRefreshToken(refreshTokenValue, ttlSeconds) {
  const redis = requireRedis();
  const parsed = parseRefreshTokenValue(refreshTokenValue);
  if (!parsed) {
    throw new AppError("Invalid refresh token", 401, "REFRESH_TOKEN_INVALID");
  }

  const { tokenId, secret } = parsed;
  const key = `${REFRESH_PREFIX}${tokenId}`;

  const revoked = await redis.get(`${REVOKED_PREFIX}${tokenId}`);
  if (revoked) {
    const reuseMeta = JSON.parse(revoked);
    await revokeFamily(reuseMeta.familyId, reuseMeta.userId);
    throw new AppError("Refresh token reuse detected", 401, "REFRESH_TOKEN_REUSE");
  }

  const stored = await redis.get(key);
  if (!stored) {
    throw new AppError("Refresh token expired or invalid", 401, "REFRESH_TOKEN_INVALID");
  }

  const data = JSON.parse(stored);
  if (!safeEqual(hashSecret(secret), data.secretHash)) {
    throw new AppError("Invalid refresh token", 401, "REFRESH_TOKEN_INVALID");
  }

  const activeFamilyTokenId = await redis.get(`${FAMILY_PREFIX}${data.familyId}`);
  if (activeFamilyTokenId && activeFamilyTokenId !== tokenId) {
    await revokeFamily(data.familyId, data.userId);
    throw new AppError("Refresh token reuse detected", 401, "REFRESH_TOKEN_REUSE");
  }

  await redis.setEx(
    `${REVOKED_PREFIX}${tokenId}`,
    ttlSeconds,
    JSON.stringify({ userId: data.userId, familyId: data.familyId })
  );
  await revokeTokenId(tokenId, data.userId);

  const rotated = await createRefreshToken(data.userId, ttlSeconds, data.familyId);
  return { ...rotated, userId: data.userId };
}

async function revokeRefreshToken(refreshTokenValue) {
  const redis = requireRedis();
  const parsed = parseRefreshTokenValue(refreshTokenValue);
  if (!parsed) return;

  const key = `${REFRESH_PREFIX}${parsed.tokenId}`;
  const stored = await redis.get(key);
  if (!stored) return;

  const data = JSON.parse(stored);
  if (!safeEqual(hashSecret(parsed.secret), data.secretHash)) return;

  await revokeTokenId(parsed.tokenId, data.userId);
  await redis.del(`${FAMILY_PREFIX}${data.familyId}`);
}

module.exports = {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  parseRefreshTokenValue,
};
