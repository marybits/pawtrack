import Pet from "../models/Pet.js";

export async function createPet(ownerId, { name, species, breed, age, weight }) {
  const pet = new Pet({ ownerId, name, species, breed, age, weight });
  await pet.save();
  return pet;
}

export async function findPetsByOwner(ownerId) {
  return Pet.find({ ownerId }).sort({ createdAt: -1 });
}

export async function findPetById(petId) {
  return Pet.findById(petId);
}

export async function updatePetAvatar(petId, avatarUrl) {
  return Pet.findByIdAndUpdate(petId, { avatarUrl }, { new: true });
}

export async function updatePet(petId, updates) {
  return Pet.findByIdAndUpdate(petId, { $set: updates }, { new: true, runValidators: true });
}
