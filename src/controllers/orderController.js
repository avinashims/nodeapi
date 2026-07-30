const prisma = require("../lib/prisma");
const {
  invalidateOrderRelatedCache,
  invalidateProductCache,
} = require("../lib/cache");
const { incrementStockForItems, orderStockWasReserved } = require("../lib/orderStock");

function parseOrderId(id) {
  const orderId = parseInt(id, 10);
  if (isNaN(orderId) || orderId <= 0) {
    return null;
  }
  return orderId;
}

const orderInclude = {
  orderItems: {
    include: {
      product: { select: { id: true, name: true, imageUrl: true, price: true } },
    },
  },
  user: { select: { id: true, name: true, email: true } },
};

async function getMyOrders(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: orderInclude,
      }),
      prisma.order.count({ where: { userId: req.user.id } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(req.user.role === "ADMIN" ? {} : { userId: req.user.id }),
      },
      include: orderInclude,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function getAllOrders(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderId = parseOrderId(req.params.id);
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const updateData = { status };
    if (
      status === "DELIVERED" &&
      order.paymentMethod === "COD" &&
      order.paymentStatus === "PENDING"
    ) {
      updateData.paymentStatus = "PAID";
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: orderInclude,
    });

    await invalidateOrderRelatedCache(updatedOrder.userId);

    return res.status(200).json({
      success: true,
      message: "Order status updated",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function cancelOrder(req, res) {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
      include: { orderItems: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status ${order.status}`,
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (orderStockWasReserved(order)) {
        await incrementStockForItems(tx, order.orderItems);
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: orderInclude,
      });
    });

    await invalidateOrderRelatedCache(req.user.id);
    if (orderStockWasReserved(order)) {
      await invalidateProductCache();
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
