import {
  createPet,
  findPetsByOwner,
  findPetById,
  updatePetAvatar,
  updatePet as updatePetService,
  deletePet,
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

export async function updatePet(req, res) {
  const allowed = ["name", "species", "breed", "age", "weight"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    const pet = await findPetById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (String(pet.ownerId) !== req.userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await updatePetService(req.params.id, updates);
    if (!updated) return res.status(404).json({ message: "Pet not found" });
    return res.status(200).json(updated);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)[0].message;
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removePet(req, res) {
  try {
    const pet = await findPetById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (String(pet.ownerId) !== req.userId) return res.status(403).json({ message: "Forbidden" });

    await deletePet(req.params.id);
    return res.status(200).json({ message: "Pet deleted" });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function uploadAvatar(req, res) {
  const { avatarUrl } = req.body;

  if (!avatarUrl) {
    return res.status(400).json({ message: "avatarUrl is required" });
  }

  const isDataUrl = avatarUrl.startsWith("data:image/");
  const isHttpsUrl = avatarUrl.startsWith("https://");
  if (!isDataUrl && !isHttpsUrl) {
    return res.status(400).json({ message: "avatarUrl must be a data: image URL or https URL" });
  }

  try {
    const pet = await findPetById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (String(pet.ownerId) !== req.userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await updatePetAvatar(req.params.id, avatarUrl);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    return res.status(500).json({ message: "Server error" });
  }
}
