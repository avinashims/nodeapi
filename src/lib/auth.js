const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("./prisma");

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_DAYS = parseInt(process.env.JWT_REFRESH_DAYS, 10) || 7;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

const userFields = { id: true, name: true, email: true, role: true, createdAt: true };

// --- Access token (15 minutes) ---
function createAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// --- Refresh token (7 days in MySQL) ---
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return token;
}

async function getUserIdFromRefreshToken(token) {
  if (!token) return null;

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }

  return row.userId;
}

async function deleteRefreshToken(token) {
  if (!token) return;
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
}

async function deleteAllRefreshTokens(userId) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// --- HttpOnly cookie ---
const COOKIE_NAME = "refreshToken";

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_MS,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
}

function getRefreshCookie(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

// --- Login response helper ---
async function sendAuthResponse(res, user, message, statusCode = 200) {
  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  setRefreshCookie(res, refreshToken);

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      expiresIn: 15 * 60,
    },
  });
}

module.exports = {
  userFields,
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  getUserIdFromRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  sendAuthResponse,
};
