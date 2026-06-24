import { Router } from "express";
import { register, login } from "../controllers/usersController.js";

const router = Router();

// Public — no auth middleware
router.post("/register", register);
router.post("/login", login);

export default router;
