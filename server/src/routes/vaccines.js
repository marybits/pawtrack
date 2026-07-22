import { Router } from "express";
import { listVaccines, addVaccine, editVaccine, removeVaccine } from "../controllers/vaccinesController.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/pets/{petId}/vaccines:
 *   get:
 *     tags: [Vaccines]
 *     summary: List all vaccine records for a pet
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of vaccine records
 */
router.get("/",        listVaccines);

/**
 * @swagger
 * /api/pets/{petId}/vaccines:
 *   post:
 *     tags: [Vaccines]
 *     summary: Add a vaccine record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date]
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               nextDue:
 *                 type: string
 *                 format: date
 *               vet:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vaccine record created
 */
router.post("/",       addVaccine);

/**
 * @swagger
 * /api/pets/{petId}/vaccines/{id}:
 *   patch:
 *     tags: [Vaccines]
 *     summary: Edit a vaccine record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Updated vaccine record
 */
router.patch("/:id",   editVaccine);

/**
 * @swagger
 * /api/pets/{petId}/vaccines/{id}:
 *   delete:
 *     tags: [Vaccines]
 *     summary: Delete a vaccine record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vaccine record deleted
 */
router.delete("/:id",  removeVaccine);

export default router;
