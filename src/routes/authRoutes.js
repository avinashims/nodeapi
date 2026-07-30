const express = require("express");
const {
  register,
  registerAdmin,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, getMe);

module.exports = router;
