import express from "express";

import * as faqController from "../controllers/faqController.js";

const router = express.Router();

router.get("/get_faqs", faqController.getFaqs);
router.post("/add_faq", faqController.createFaq);
router.delete("/delete_faq/:id", faqController.deleteFaqById);
router.put("/edit_faq/:id", faqController.editFaqById);

export default router;
