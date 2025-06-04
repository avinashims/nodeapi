import express from "express";
import * as productController from "../controllers/productController.js";
import multer from "multer";
import { fileStorageForProduct, fileFilter } from "../utils/multer.js";

const router = express.Router();

const upload = multer({
  storage: fileStorageForProduct,
  fileFilter,
}).array("products", 50);

const uploadSingle = multer({
  storage: fileStorageForProduct,
  fileFilter,
}).single("products");

router.post("/create_product", uploadSingle, productController.createProduct);
router.get("/products", productController.getProducts);
router.get("/product/:id", productController.getProductById);
router.get("/products/:categoryId", productController.getProductsByCategory);
router.put("/update_product/:id", productController.updateProduct);
router.delete("/delete_product/:id", productController.deleteProductById);

export default router;
