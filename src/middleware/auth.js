const prisma = require("../lib/prisma");
const { verifyAccessToken } = require("../lib/auth");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access token required" });
    }

    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
