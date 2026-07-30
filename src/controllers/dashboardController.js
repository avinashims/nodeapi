const prisma = require("../lib/prisma");
const { cacheGet, cacheSet } = require("../lib/cache");
const { cacheKeys } = require("../lib/cacheKeys");

async function getDashboard(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = cacheKeys.customerDashboard(userId);

    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const [user, orders, orderStats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          orderItems: {
            include: { product: { select: { id: true, name: true, imageUrl: true } } },
          },
        },
      }),
      prisma.order.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    });

    const response = {
      success: true,
      data: {
        user,
        summary: {
          totalOrders: orderStats._count.id,
          totalSpent: orderStats._sum.total || 0,
          ordersByStatus: ordersByStatus.reduce((acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          }, {}),
        },
        recentOrders: orders,
      },
    };

    await cacheSet(cacheKey, response, 60);
    res.set("X-Cache", "MISS");
    return res.status(200).json(response);
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const cacheKey = cacheKeys.adminDashboard();
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const [totalUsers, totalProducts, totalOrders, revenue, recentOrders] =
      await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { total: true } }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: {
              include: { product: { select: { id: true, name: true } } },
            },
          },
        }),
      ]);

    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const response = {
      success: true,
      data: {
        summary: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue: revenue._sum.total || 0,
          ordersByStatus: ordersByStatus.reduce((acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          }, {}),
        },
        recentOrders,
      },
    };

    await cacheSet(cacheKey, response, 60);
    res.set("X-Cache", "MISS");
    return res.status(200).json(response);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { getDashboard, getAdminDashboard };
