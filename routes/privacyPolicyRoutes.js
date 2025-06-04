import express from "express";
import {
  createPrivacyPolicy,
  deletePrivacyPolicyById,
  getPrivacyPolicy,
  updatePrivacyPolicyById,
} from "../controllers/privacyPolicyController.js";

const router = express.Router();

router.post("/create_privacy_policy", createPrivacyPolicy);
router.get("/get_privacy_policy", getPrivacyPolicy);
router.delete("/delete_privacy_policy/:id", deletePrivacyPolicyById);
router.put("/update_privacy_policy/:id", updatePrivacyPolicyById);

export default router;
