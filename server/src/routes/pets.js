import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { registerPet, listPets, getPet, updatePet, uploadAvatar, removePet } from "../controllers/petsController.js";

const router = Router();

// All pet routes require a valid JWT.
router.use(requireAuth);

/**
 * @swagger
 * /api/pets:
 *   post:
 *     tags: [Pets]
 *     summary: Register a new pet
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, species]
 *             properties:
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *                 enum: [dog, cat]
 *               breed:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Pet created
 *       401:
 *         description: Unauthorized
 */
router.post("/", registerPet);

/**
 * @swagger
 * /api/pets:
 *   get:
 *     tags: [Pets]
 *     summary: List all pets belonging to the authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of pet objects
 *       401:
 *         description: Unauthorized
 */
router.get("/", listPets);

/**
 * @swagger
 * /api/pets/{id}:
 *   get:
 *     tags: [Pets]
 *     summary: Get a single pet by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pet object
 *       403:
 *         description: Pet belongs to another user
 *       404:
 *         description: Pet not found
 */
router.get("/:id", getPet);

/**
 * @swagger
 * /api/pets/{id}:
 *   patch:
 *     tags: [Pets]
 *     summary: Update pet details (name, breed, birthDate, etc.)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated pet object
 *       403:
 *         description: Unauthorized
 */
router.patch("/:id", updatePet);

/**
 * @swagger
 * /api/pets/{id}/avatar:
 *   patch:
 *     tags: [Pets]
 *     summary: Upload or replace a pet's avatar (base64 data URL)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatarUrl]
 *             properties:
 *               avatarUrl:
 *                 type: string
 *                 description: Base64 data URL of the image (max 2 MB)
 *     responses:
 *       200:
 *         description: Updated pet object with avatarUrl
 */
router.patch("/:id/avatar", uploadAvatar);

/**
 * @swagger
 * /api/pets/{id}:
 *   delete:
 *     tags: [Pets]
 *     summary: Delete a pet and cascade-delete all its events, prescriptions, and vaccines
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pet deleted
 *       403:
 *         description: Unauthorized
 */
router.delete("/:id", removePet);

export default router;
