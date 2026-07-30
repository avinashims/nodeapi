const { verifyAccessToken } = require("../lib/jwt");
const prisma = require("../lib/prisma");
const { AppError } = require("../lib/errors");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access token required", 401, "ACCESS_TOKEN_MISSING");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError("User not found", 401, "USER_NOT_FOUND");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Access denied", 403, "FORBIDDEN"));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
