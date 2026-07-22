import { Router } from "express";
import {
  listPrescriptions,
  addPrescription,
  patchPrescription,
} from "../controllers/prescriptionsController.js";

const router = Router({ mergeParams: true }); // inherit :petId from parent

/**
 * @swagger
 * /api/pets/{petId}/prescriptions:
 *   get:
 *     tags: [Prescriptions]
 *     summary: List active prescriptions for a pet
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of prescription objects
 */
router.get("/",       listPrescriptions);

/**
 * @swagger
 * /api/pets/{petId}/prescriptions:
 *   post:
 *     tags: [Prescriptions]
 *     summary: Add a prescription
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               dose:
 *                 type: string
 *               unit:
 *                 type: string
 *               frequency:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Prescription created
 */
router.post("/",      addPrescription);

/**
 * @swagger
 * /api/pets/{petId}/prescriptions/{rxId}:
 *   patch:
 *     tags: [Prescriptions]
 *     summary: Update a prescription (e.g. mark inactive when course ends)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: rxId
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
 *         description: Updated prescription
 */
router.patch("/:rxId", patchPrescription);

export default router;
