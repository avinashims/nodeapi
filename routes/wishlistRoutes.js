import express from "express";
import * as wishlistController from "../controllers/wishlistController.js";

const router = express.Router();

router.post("/create_wishlist", wishlistController.createWishlist);
router.get("/get_wishlist/:userId", wishlistController.getWishlist);
router.delete(
  "/delete_wishlist/:userId/:productId",
  wishlistController.deleteWishlist
);

export default router;
