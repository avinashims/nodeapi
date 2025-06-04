import express from "express";
import {
  getAboutUs,
  createAboutUs,
  deleteAboutUsById,
  editAboutUsById,
} from "../controllers/aboutUsController.js";

const router = express.Router();

router.get("/get_aboutus", getAboutUs);
router.post("/add_aboutus", createAboutUs);
router.delete("/delete_aboutus/:id", deleteAboutUsById);
router.put("/update_aboutus/:id", editAboutUsById);

export default router;
