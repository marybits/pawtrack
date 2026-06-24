import { Router } from "express";
import { logEvent, listEvents } from "../controllers/eventsController.js";

// mergeParams: true is required so req.params.petId (from the parent route
// /api/pets/:petId/events) is accessible inside this nested router.
const router = Router({ mergeParams: true });

router.post("/", logEvent);
router.get("/", listEvents);

export default router;
