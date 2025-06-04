import express from "express";

import * as cartController from "../controllers/cartController.js";

const router = express.Router();

router.post("/add_to_cart", cartController.addToCart);
router.get("/get_user_cart/:userId", cartController.getUserCart);
router.delete(
  "/remove_from_cart/:userId/:productId",
  cartController.removeFromCart
);

export default router;
