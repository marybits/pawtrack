import { findPetById } from "../services/petsService.js";

/**
 * Verifies that the pet identified by :petId exists and belongs to the
 * authenticated user (req.userId set by requireAuth).
 *
 * On success: attaches req.pet and calls next().
 * On failure: returns 404 (pet not found) or 403 (pet exists but not owned).
 *
 * By attaching req.pet, downstream controllers avoid a redundant DB fetch.
 */
export async function requirePetOwnership(req, res, next) {
  try {
    const pet = await findPetById(req.params.petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (String(pet.ownerId) !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.pet = pet;
    next();
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ message: "Pet not found" });
    }
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
