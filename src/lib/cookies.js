const REFRESH_COOKIE = "refreshToken";
const REFRESH_TTL_SECONDS = parseInt(process.env.JWT_REFRESH_TTL_SECONDS, 10) || 7 * 24 * 60 * 60;

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/api/auth",
    maxAge: REFRESH_TTL_SECONDS * 1000,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/api/auth",
  });
}

function getRefreshTokenFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE] || null;
}

module.exports = {
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromRequest,
};
