import express from "express";
import {
  createTermsAndConditions,
  deleteTermsAndConditionsById,
  getTermsAndConditions,
  updateTermsAndConditionsById,
} from "../controllers/termsAndConditionsController.js";

const router = express.Router();

router.post("/create_terms_and_conditions", createTermsAndConditions);
router.get("/terms_and_conditions", getTermsAndConditions);
router.delete("/delete_terms_and_conditions/:id", deleteTermsAndConditionsById);
router.put("/update_terms_and_conditions/:id", updateTermsAndConditionsById);

export default router;
