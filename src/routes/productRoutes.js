const express = require("express");
const {
  getProducts,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
} = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");
const { uploadProductImage } = require("../middleware/upload");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", authenticate, authorize("ADMIN"), uploadProductImage.single("image"), addProduct);
router.put("/:id", authenticate, authorize("ADMIN"), uploadProductImage.single("image"), editProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteProduct);

module.exports = router;
