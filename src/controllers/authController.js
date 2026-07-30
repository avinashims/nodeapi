const prisma = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../lib/password");
const { issueAuthSession } = require("../lib/authSession");
const { AppError, asyncHandler } = require("../lib/errors");
const { rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require("../lib/refreshToken");
const {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromRequest,
  REFRESH_TTL_SECONDS,
} = require("../lib/cookies");
const { signAccessToken, getAccessTokenTtlSeconds } = require("../lib/jwt");

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true };

function validateRegistrationInput(name, email, password) {
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400, "VALIDATION_ERROR");
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR");
  }
}

async function register(req, res) {
  const { name, email, password } = req.body;
  validateRegistrationInput(name, email, password);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
    select: userSelect,
  });

  return issueAuthSession(res, user, {
    statusCode: 201,
    message: "Registration successful",
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return issueAuthSession(res, publicUser, { message: "Login successful" });
}

async function registerAdmin(req, res) {
  const { name, email, password, adminSecret } = req.body;
  const expectedSecret = process.env.ADMIN_REGISTRATION_SECRET;

  if (!expectedSecret) {
    throw new AppError("Admin registration is not configured on the server", 503, "NOT_CONFIGURED");
  }

  if (!adminSecret || adminSecret !== expectedSecret) {
    throw new AppError("Invalid admin registration secret", 403, "FORBIDDEN");
  }

  validateRegistrationInput(name, email, password);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: "ADMIN" },
    select: userSelect,
  });

  return issueAuthSession(res, user, {
    statusCode: 201,
    message: "Admin registration successful",
  });
}

async function refresh(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    throw new AppError("Refresh token required", 401, "REFRESH_TOKEN_MISSING");
  }

  const { refreshToken: newRefreshToken, userId } = await rotateRefreshToken(
    refreshToken,
    REFRESH_TTL_SECONDS
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    clearRefreshCookie(res);
    throw new AppError("User not found", 401, "USER_NOT_FOUND");
  }

  setRefreshCookie(res, newRefreshToken);

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: {
      user,
      accessToken,
      expiresIn: getAccessTokenTtlSeconds(),
    },
  });
}

async function logout(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

async function logoutAll(req, res) {
  await revokeAllUserTokens(req.user.id);
  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
}

async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}

module.exports = {
  register: asyncHandler(register),
  registerAdmin: asyncHandler(registerAdmin),
  login: asyncHandler(login),
  refresh: asyncHandler(refresh),
  logout: asyncHandler(logout),
  logoutAll: asyncHandler(logoutAll),
  getMe: asyncHandler(getMe),
};
