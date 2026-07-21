import request from "supertest";
import app from "../src/app.js";

let seq = 0;

/**
 * Register a new user and return their token + id.
 * Each call generates a unique username/email to avoid collisions.
 */
export async function registerUser(overrides = {}) {
  seq++;
  const username = overrides.username ?? `testuser${seq}`;
  const email    = overrides.email    ?? `testuser${seq}@example.com`;
  const password = overrides.password ?? "password123";

  const res = await request(app)
    .post("/api/users/register")
    .send({ username, email, password });

  return { token: res.body.token, userId: res.body.user?.id, username, email, password };
}

/**
 * Create a pet for the given user token and return the pet document.
 */
export async function createPet(token, overrides = {}) {
  const res = await request(app)
    .post("/api/pets")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Buddy", species: "dog", breed: "Labrador", age: 3, ...overrides });

  return res.body;
}
