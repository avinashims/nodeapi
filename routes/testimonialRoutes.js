import express from "express";
import {
  createTestimonial,
  deleteTestimonialById,
  getTestimonials,
} from "../controllers/testimonialController.js";

const router = express.Router();

router.post("/create_testimonal", createTestimonial);
router.get("/get_testimonials", getTestimonials);
router.delete("/delete_testimonial/:id", deleteTestimonialById);

export default router;
