import express from "express";
import { getTopModels } from "../controllers/topModelController.js";

const router = express.Router();

router.get("/top_models", getTopModels);

export default router;
