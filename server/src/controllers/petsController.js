import {
  createPet,
  findPetsByOwner,
  findPetById,
} from "../services/petsService.js";

export async function registerPet(req, res) {
  const { name, species, breed, age, weight } = req.body;

  if (!name || !species) {
    return res.status(400).json({ message: "name and species are required" });
  }

  try {
    // ownerId is always taken from the verified JWT — never from req.body.
    const pet = await createPet(req.userId, { name, species, breed, age, weight });
    return res.status(201).json(pet);
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)[0].message;
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listPets(req, res) {
  try {
    const pets = await findPetsByOwner(req.userId);
    return res.status(200).json(pets);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getPet(req, res) {
  try {
    const pet = await findPetById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (String(pet.ownerId) !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(pet);
  } catch (err) {
    // Malformed ObjectId
    if (err.name === "CastError") {
      return res.status(404).json({ message: "Pet not found" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}
