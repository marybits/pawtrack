import { Router } from "express";
import { parseEvent } from "../controllers/parseController.js";

const router = Router();

// Auth is applied in app.js at mount time.
router.post("/", parseEvent);

export default router;
