import express from "express";
import * as categoryController from "../controllers/categoryController.js";
const router = express.Router();

router.post("/create_category", categoryController.createCategory);
router.get("/get_categories", categoryController.getCategories);
router.delete("/delete_category/:id", categoryController.deleteCategoryById);
router.put("/update_category_name/:id", categoryController.updateCategoryName);

export default router;
