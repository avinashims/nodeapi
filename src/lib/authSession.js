const { signAccessToken, getAccessTokenTtlSeconds } = require("./jwt");
const { createRefreshToken } = require("./refreshToken");
const { setRefreshCookie, REFRESH_TTL_SECONDS } = require("./cookies");

async function issueAuthSession(res, user, { statusCode = 200, message } = {}) {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const { refreshToken } = await createRefreshToken(user.id, REFRESH_TTL_SECONDS);
  setRefreshCookie(res, refreshToken);

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user,
      accessToken,
      expiresIn: getAccessTokenTtlSeconds(),
    },
  });
}

module.exports = { issueAuthSession };
