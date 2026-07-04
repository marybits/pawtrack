import { Router }      from "express";
import { getInsights } from "../controllers/insightsController.js";

// mergeParams: true so req.params.petId (from the parent route) is accessible.
const router = Router({ mergeParams: true });

router.post("/", getInsights);

export default router;
