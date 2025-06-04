
/**
 * @swagger
 * /sample:
 *   get:
 *     summary: Returns a sample message
 *     responses:
 *       200:
 *         description: A successful response
 */

import express from "express";
import * as userController from "../controllers/userController.js";
import multer from "multer";
import { fileStorage, fileFilter } from "../utils/multer.js";
import { middleware } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/register_user",
  multer({ storage: fileStorage, fileFilter }).single("profilePicture"),
  userController.registerUser
);

router.post("/login", userController.loginUser);

router.post("/logout", userController.logoutUser);

router.put("/update_user/:id", userController.updateUser);

router.get("/verify", userController.verifyUser);

router.post("forgot_password", userController.forgotPassword);

router.get("/get_user", middleware, userController.getUser);

router.get("/total_users", userController.totalUsers);

router.patch("/toggle_block_user/:id", userController.toggleBlockUser);

router.delete("/delete_user/:id", userController.deleteUserById);

export default router;
