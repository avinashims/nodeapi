const express = require("express");
const auth = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", auth.register);
router.post("/register-admin", auth.registerAdmin);
router.post("/login", auth.login);
router.post("/refresh", auth.refresh);
router.post("/logout", auth.logout);
router.post("/logout-all", authenticate, auth.logoutAll);
router.get("/me", authenticate, auth.getMe);

module.exports = router;
