const prisma = require("../lib/prisma");
const razorpay = require("../lib/razorpay");
const { verifyRazorpaySignature, toNumber } = require("../lib/utils");
const { invalidateOrderRelatedCache, invalidateProductCache } = require("../lib/cache");
const { decrementStockForItems } = require("../lib/orderStock");

async function getUserCart(userId) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
}

function validateShippingDetails(body) {
  const { shippingAddress, shippingCity, shippingState, shippingZip, shippingPhone } = body;

  if (!shippingAddress?.trim()) {
    return { error: "Shipping address is required" };
  }
  if (!shippingCity?.trim()) {
    return { error: "Shipping city is required" };
  }
  if (!shippingState?.trim()) {
    return { error: "Shipping state is required" };
  }
  if (!shippingZip?.trim()) {
    return { error: "Shipping zip code is required" };
  }
  if (!shippingPhone?.trim()) {
    return { error: "Shipping phone is required" };
  }

  return {
    data: {
      shippingAddress: shippingAddress.trim(),
      shippingCity: shippingCity.trim(),
      shippingState: shippingState.trim(),
      shippingZip: shippingZip.trim(),
      shippingPhone: shippingPhone.trim(),
    },
  };
}

function parsePaymentMethod(body) {
  const raw = body.paymentMethod?.toUpperCase?.() || "RAZORPAY";
  if (!["RAZORPAY", "COD"].includes(raw)) {
    return { error: "paymentMethod must be RAZORPAY or COD" };
  }
  return { value: raw };
}

const orderInclude = {
  orderItems: {
    include: { product: { select: { id: true, name: true, imageUrl: true } } },
  },
};

async function checkout(req, res) {
  try {
    const shippingValidation = validateShippingDetails(req.body);
    if (shippingValidation.error) {
      return res.status(400).json({ success: false, message: shippingValidation.error });
    }

    const paymentMethodResult = parsePaymentMethod(req.body);
    if (paymentMethodResult.error) {
      return res.status(400).json({ success: false, message: paymentMethodResult.error });
    }
    const paymentMethod = paymentMethodResult.value;

    const cart = await getUserCart(req.user.id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + toNumber(item.product.price) * item.quantity,
      0
    );

    const orderItemsCreate = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          total,
          paymentMethod,
          status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
          paymentStatus: "PENDING",
          ...shippingValidation.data,
          orderItems: { create: orderItemsCreate },
        },
        include: {
          orderItems: { include: { product: true } },
        },
      });

      if (paymentMethod === "COD") {
        await decrementStockForItems(tx, createdOrder.orderItems);
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: orderInclude,
      });
    });

    await invalidateOrderRelatedCache(req.user.id);
    if (paymentMethod === "COD") {
      await invalidateProductCache();
    }

    const message =
      paymentMethod === "COD"
        ? "Order placed successfully. Pay cash on delivery."
        : "Order created successfully. Proceed to payment.";

    return res.status(201).json({
      success: true,
      message,
      data: order,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error.message?.includes("Insufficient stock")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function createRazorpayOrder(req, res) {
  try {
    const orderId = parseInt(req.body.orderId, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: "Valid order ID is required" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentMethod === "COD") {
      return res.status(400).json({
        success: false,
        message: "This order uses Cash on Delivery. Online payment is not required.",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    if (order.razorpayOrderId) {
      return res.status(200).json({
        success: true,
        message: "Razorpay order already exists",
        data: {
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          amount: toNumber(order.total),
          currency: "INR",
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(toNumber(order.total) * 100),
      currency: "INR",
      receipt: `order_${order.id}`,
      notes: {
        orderId: String(order.id),
        userId: String(req.user.id),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: toNumber(order.total),
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
}

async function verifyPayment(req, res) {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "orderId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    const parsedOrderId = parseInt(orderId, 10);
    if (isNaN(parsedOrderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await prisma.order.findFirst({
      where: { id: parsedOrderId, userId: req.user.id },
      include: {
        orderItems: { include: { product: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentMethod === "COD") {
      return res.status(400).json({
        success: false,
        message: "Cash on Delivery orders cannot be verified with Razorpay",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: order,
      });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Razorpay order mismatch" });
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await decrementStockForItems(tx, order.orderItems);

      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          razorpayPaymentId: razorpay_payment_id,
        },
        include: orderInclude,
      });
    });

    await invalidateOrderRelatedCache(req.user.id);
    await invalidateProductCache();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    if (error.message?.includes("Insufficient stock")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
}

module.exports = { checkout, createRazorpayOrder, verifyPayment };
