import bcrypt from "bcryptjs";
import User from "../models/User.js";

export async function createUser(username, email, password) {
  const hash = await bcrypt.hash(password, 12);
  const user = new User({ username, email, password: hash });
  await user.save();
  return user;
}

export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

export async function findByUsername(username) {
  return User.findOne({ username });
}

export async function findById(id) {
  return User.findById(id);
}
