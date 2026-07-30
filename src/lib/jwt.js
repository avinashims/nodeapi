const jwt = require("jsonwebtoken");
const { AppError } = require("./errors");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

if (!ACCESS_SECRET) {
  console.warn("JWT_ACCESS_SECRET or JWT_SECRET is not set");
}

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
    issuer: "ecommerce-api",
    audience: "ecommerce-client",
  });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET, {
      issuer: "ecommerce-api",
      audience: "ecommerce-client",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Access token expired", 401, "ACCESS_TOKEN_EXPIRED");
    }
    throw new AppError("Invalid access token", 401, "ACCESS_TOKEN_INVALID");
  }
}

function getAccessTokenTtlSeconds() {
  // 15 minutes default
  const raw = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  if (raw.endsWith("m")) return parseInt(raw, 10) * 60;
  if (raw.endsWith("h")) return parseInt(raw, 10) * 3600;
  if (raw.endsWith("d")) return parseInt(raw, 10) * 86400;
  return 900;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  getAccessTokenTtlSeconds,
};
