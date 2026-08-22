const express = require("express");
const { chat, generateProductDescription } = require("../controllers/aiController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/chat", authenticate, chat);
router.post("/product-description", authenticate, authorize("ADMIN"), generateProductDescription);

module.exports = router;
