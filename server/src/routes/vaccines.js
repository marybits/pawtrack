import { Router } from "express";
import { listVaccines, addVaccine, editVaccine, removeVaccine } from "../controllers/vaccinesController.js";

const router = Router({ mergeParams: true });

router.get("/",        listVaccines);
router.post("/",       addVaccine);
router.patch("/:id",   editVaccine);
router.delete("/:id",  removeVaccine);

export default router;
