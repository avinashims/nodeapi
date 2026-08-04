const crypto = require("crypto");

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

function toNumber(value) {
  return Number(value);
}

module.exports = { verifyRazorpaySignature, toNumber };
