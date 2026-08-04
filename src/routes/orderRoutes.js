const express = require("express");
const {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/my", getMyOrders);
router.get("/admin/all", authorize("ADMIN"), getAllOrders);
router.put("/:id/status", authorize("ADMIN"), updateOrderStatus);
router.put("/:id/cancel", cancelOrder);
router.get("/:id", getOrderById);

module.exports = router;
