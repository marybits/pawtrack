import { Router } from "express";
import { logEvent, listEvents, editEvent, removeEvent } from "../controllers/eventsController.js";

// mergeParams: true is required so req.params.petId (from the parent route
// /api/pets/:petId/events) is accessible inside this nested router.
const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/pets/{petId}/events:
 *   post:
 *     tags: [Events]
 *     summary: Log a new event for a pet
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
 *             required: [type, occurredAt]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [meal, medication, activity, litter, bathroom, treats, weight]
 *               occurredAt:
 *                 type: string
 *                 format: date-time
 *               details:
 *                 type: object
 *                 description: Per-type detail fields (food, amount, duration, etc.)
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event logged
 *       403:
 *         description: Pet belongs to another user
 */
router.post("/",          logEvent);

/**
 * @swagger
 * /api/pets/{petId}/events:
 *   get:
 *     tags: [Events]
 *     summary: List events for a pet (supports date range and type filter)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO 8601, inclusive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *     responses:
 *       200:
 *         description: Array of event objects
 */
router.get("/",           listEvents);

/**
 * @swagger
 * /api/pets/{petId}/events/{eventId}:
 *   patch:
 *     tags: [Events]
 *     summary: Edit an existing event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
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
 *         description: Updated event object
 *       404:
 *         description: Event not found
 */
router.patch("/:eventId", editEvent);

/**
 * @swagger
 * /api/pets/{petId}/events/{eventId}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 *       404:
 *         description: Event not found
 */
router.delete("/:eventId", removeEvent);

export default router;
