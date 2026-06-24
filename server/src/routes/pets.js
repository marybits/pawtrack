import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { registerPet, listPets, getPet } from "../controllers/petsController.js";

const router = Router();

// All pet routes require a valid JWT.
router.use(requireAuth);

router.post("/", registerPet);
router.get("/", listPets);
router.get("/:id", getPet);

export default router;
