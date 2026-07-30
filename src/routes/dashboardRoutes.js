const express = require("express");
const { getDashboard, getAdminDashboard } = require("../controllers/dashboardController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, getDashboard);
router.get("/admin", authenticate, authorize("ADMIN"), getAdminDashboard);

module.exports = router;
