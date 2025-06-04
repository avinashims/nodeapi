import express from "express";
import {
  createCareers,
  deleteCareerById,
  editCareerById,
  getCareers,
} from "../controllers/careersController.js";

const router = express.Router();

router.get("/get_careers", getCareers);
router.post("/add_career", createCareers);
router.delete("/delete_career/:id", deleteCareerById);
router.put("/edit_career/:id", editCareerById);

export default router;
