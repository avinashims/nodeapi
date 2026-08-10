const nodemailer = require("nodemailer");

let transporter = null;

function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isSmtpConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const resetHours = parseInt(process.env.PASSWORD_RESET_HOURS, 10) || 1;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const subject = "Reset your password";
  const text = `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in ${resetHours} hour(s). If you did not request this, ignore this email.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in ${resetHours} hour(s). If you did not request this, ignore this email.</p>
  `;

  const transport = getTransporter();

  if (!transport) {
    console.log("[mail] SMTP not configured — password reset link:", resetUrl);
    return false;
  }

  await transport.sendMail({ from, to, subject, text, html });
  return true;
}

module.exports = { isSmtpConfigured, sendPasswordResetEmail };
