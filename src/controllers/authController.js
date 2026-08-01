const prisma = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../lib/password");
const {
  userFields,
  createAccessToken,
  getUserIdFromRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  sendAuthResponse,
  createRefreshToken,
} = require("../lib/auth");

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password) },
    select: userFields,
  });

  return sendAuthResponse(res, user, "Registration successful", 201);
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  return sendAuthResponse(res, user, "Login successful");
}

async function registerAdmin(req, res) {
  const { name, email, password, adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
    return res.status(403).json({ success: false, message: "Invalid admin secret" });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password), role: "ADMIN" },
    select: userFields,
  });

  return sendAuthResponse(res, user, "Admin registered", 201);
}

async function refresh(req, res) {
  const oldToken = getRefreshCookie(req);
  const userId = await getUserIdFromRefreshToken(oldToken);

  if (!userId) {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }

  await deleteRefreshToken(oldToken);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userFields });
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: "User not found" });
  }

  const accessToken = createAccessToken(user);
  const newRefreshToken = await createRefreshToken(user.id);
  setRefreshCookie(res, newRefreshToken);

  return res.json({
    success: true,
    message: "Token refreshed",
    data: { user, accessToken, expiresIn: 15 * 60 },
  });
}

async function logout(req, res) {
  await deleteRefreshToken(getRefreshCookie(req));
  clearRefreshCookie(res);
  return res.json({ success: true, message: "Logged out" });
}

async function logoutAll(req, res) {
  await deleteAllRefreshTokens(req.user.id);
  clearRefreshCookie(res);
  return res.json({ success: true, message: "Logged out from all devices" });
}

async function getMe(req, res) {
  return res.json({ success: true, data: { user: req.user } });
}

module.exports = {
  register,
  login,
  registerAdmin,
  refresh,
  logout,
  logoutAll,
  getMe,
};
