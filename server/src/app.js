import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import petsRouter from "./routes/pets.js";
import eventsRouter from "./routes/events.js";
import { requireAuth } from "./middleware/auth.js";
import { requirePetOwnership } from "./middleware/requirePetOwnership.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());

// ── Public routes ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/users", usersRouter);
// Events route must be mounted before /api/pets so the more specific path
// (/api/pets/:petId/events) is matched before the general /api/pets prefix.
app.use("/api/pets/:petId/events", requireAuth, requirePetOwnership, eventsRouter);
app.use("/api/pets", petsRouter);

// ── Protected routes ───────────────────────────────────────────────────────
// Smoke-test endpoint used in Phase 2 acceptance check. Safe to keep for
// debugging; carries no sensitive data.
app.get("/api/_protected-ping", requireAuth, (req, res) => {
  res.status(200).json({ ok: true, userId: req.userId });
});

// 404 fallback for unmatched routes, kept consistent with the project's
// error response shape (message, optional error).
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

export default app;
