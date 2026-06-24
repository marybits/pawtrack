import User from "../models/User.js";

export async function createUser(username, email, password) {
  const user = new User({ username, email, password });
  await user.save();
  return user;
}

export async function findByUsername(username) {
  return User.findOne({ username });
}

export async function findById(id) {
  return User.findById(id);
}
