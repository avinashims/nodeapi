const crypto = require("crypto");
const prisma = require("./prisma");

const RESET_HOURS = parseInt(process.env.PASSWORD_RESET_HOURS, 10) || 1;
const RESET_MS = RESET_HOURS * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return token;
}

async function getUserIdFromResetToken(token) {
  if (!token) return null;

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }

  return row.userId;
}

async function deletePasswordResetToken(token) {
  if (!token) return;
  await prisma.passwordResetToken.deleteMany({ where: { tokenHash: hashToken(token) } });
}

async function deleteAllPasswordResetTokens(userId) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}

module.exports = {
  createPasswordResetToken,
  getUserIdFromResetToken,
  deletePasswordResetToken,
  deleteAllPasswordResetTokens,
};
