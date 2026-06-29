import { Router } from "express";
import {
  listPrescriptions,
  addPrescription,
  patchPrescription,
} from "../controllers/prescriptionsController.js";

const router = Router({ mergeParams: true }); // inherit :petId from parent

router.get("/",       listPrescriptions);
router.post("/",      addPrescription);
router.patch("/:rxId", patchPrescription);

export default router;
