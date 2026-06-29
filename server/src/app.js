import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import usersRouter from "./routes/users.js";
import petsRouter from "./routes/pets.js";
import eventsRouter from "./routes/events.js";
import parseRouter from "./routes/parse.js";
import { requireAuth } from "./middleware/auth.js";
import { requirePetOwnership } from "./middleware/requirePetOwnership.js";

const app = express();

// Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

// Limit request body to 16kb — prevents large-payload denial-of-service.
app.use(express.json({ limit: "16kb" }));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts — please try again in 15 minutes." },
});

const parseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 AI parse calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many parse requests — please slow down." },
});

// ── Public routes ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Apply login rate limiter only to the login route, not register.
app.use("/api/users/login", loginLimiter);
app.use("/api/users", usersRouter);
// Events route must be mounted before /api/pets so the more specific path
// (/api/pets/:petId/events) is matched before the general /api/pets prefix.
app.use("/api/events/parse", parseLimiter, requireAuth, parseRouter);
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
