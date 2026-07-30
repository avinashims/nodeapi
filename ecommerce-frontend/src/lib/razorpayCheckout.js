export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({ orderId, paymentApi, onSuccess, onError }) {
  await loadRazorpayScript();
  const paymentRes = await paymentApi.createRazorpayOrder({ orderId });
  const payment = paymentRes.data;

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: payment.keyId,
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      name: "ShopVerse",
      description: `Order #${orderId}`,
      order_id: payment.razorpayOrderId,
      handler: async (response) => {
        try {
          const verifyRes = await paymentApi.verify({
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          const order = verifyRes.data;
          onSuccess?.(order);
          resolve(order);
        } catch (err) {
          onError?.(err);
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
      theme: { color: "#2563eb" },
    });
    rzp.open();
  });
}
