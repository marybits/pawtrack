import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PawTrack API",
      version: "1.0.0",
      description:
        "REST API for PawTrack — a pet health tracker with AI-powered natural-language event parsing.",
    },
    servers: [
      { url: "http://localhost:5050", description: "Local development" },
      {
        url: "https://pawtrack-92is.onrender.com",
        description: "Production (Render)",
      },
    ],
    tags: [
      { name: "Auth",          description: "Register and log in" },
      { name: "Pets",          description: "Pet CRUD and avatar upload" },
      { name: "Events",        description: "Log, list, edit, and delete daily events" },
      { name: "AI",            description: "Natural-language parse and health insights" },
      { name: "Prescriptions", description: "Active medication records" },
      { name: "Vaccines",      description: "Vaccination records with next-due dates" },
      { name: "Reports",       description: "Vet report PDF download" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT returned by POST /api/users/login or /api/users/register",
        },
      },
    },
  },
  // Absolute glob so the path works regardless of the cwd the server is started from.
  apis: [path.join(__dirname, "routes/*.js")],
};

export const swaggerSpec = swaggerJsdoc(options);
