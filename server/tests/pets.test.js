import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { registerUser } from "./helpers.js";

describe("POST /api/pets", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).post("/api/pets").send({ name: "Max", species: "dog" });
    expect(res.status).toBe(401);
  });

  it("creates a pet and returns 201 for an authenticated user", async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Luna", species: "cat", breed: "Siamese", age: 2 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Luna");
    expect(res.body.species).toBe("cat");
    expect(res.body._id).toBeDefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${token}`)
      .send({ species: "dog" }); // name missing

    expect(res.status).toBe(400);
  });
});

describe("GET /api/pets", () => {
  it("returns only the authenticated user's own pets", async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    // User A registers two pets
    await request(app).post("/api/pets")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ name: "Rex",  species: "dog" });
    await request(app).post("/api/pets")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ name: "Milo", species: "cat" });

    // User B registers one pet
    await request(app).post("/api/pets")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ name: "Bella", species: "rabbit" });

    const resA = await request(app).get("/api/pets").set("Authorization", `Bearer ${userA.token}`);
    const resB = await request(app).get("/api/pets").set("Authorization", `Bearer ${userB.token}`);

    expect(resA.body).toHaveLength(2);
    expect(resB.body).toHaveLength(1);
    expect(resA.body.map((p) => p.name)).toContain("Rex");
    expect(resB.body[0].name).toBe("Bella");
  });
});

describe("PATCH /api/pets/:id", () => {
  it("updates the pet's name for the owner", async () => {
    const { token } = await registerUser();
    const pet = await request(app).post("/api/pets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Buddy", species: "dog" });

    const res = await request(app)
      .patch(`/api/pets/${pet.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Max" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Max");
  });

  it("returns 403 when a different user tries to update the pet", async () => {
    const owner  = await registerUser();
    const other  = await registerUser();

    const pet = await request(app).post("/api/pets")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Buddy", species: "dog" });

    const res = await request(app)
      .patch(`/api/pets/${pet.body._id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ name: "Hijacked" });

    expect(res.status).toBe(403);
  });
});
