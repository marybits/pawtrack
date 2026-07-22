import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { registerUser, createPet } from "./helpers.js";

describe("GET /api/pets/:petId/vaccines", () => {
  it("returns an empty array when no vaccines have been recorded", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .get(`/api/pets/${pet._id}/vaccines`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 403 for a non-owner", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const pet   = await createPet(owner.token);

    const res = await request(app)
      .get(`/api/pets/${pet._id}/vaccines`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });
});

describe("POST /api/pets/:petId/vaccines", () => {
  it("creates a vaccine record and returns 201", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/vaccines`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name:      "Rabies",
        lastGiven: "2024-06-01",
        nextDue:   "2025-06-01",
        clinic:    "Downtown Animal Clinic",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Rabies");
    expect(res.body.clinic).toBe("Downtown Animal Clinic");
    expect(res.body.petId).toBe(String(pet._id));
  });

  it("returns 400 when name is missing", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/vaccines`)
      .set("Authorization", `Bearer ${token}`)
      .send({ lastGiven: "2024-06-01", nextDue: "2025-06-01" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it("returns 401 without a token", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/vaccines`)
      .send({ name: "Rabies" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/pets/:petId/vaccines/:id", () => {
  it("deletes a vaccine and returns 204", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);
    const auth = { Authorization: `Bearer ${token}` };
    const base = `/api/pets/${pet._id}/vaccines`;

    const created = await request(app).post(base).set(auth).send({ name: "DHPP" });
    const vaccineId = created.body._id;

    const del = await request(app).delete(`${base}/${vaccineId}`).set(auth);
    expect(del.status).toBe(204);

    // Confirm it's gone
    const list = await request(app).get(base).set(auth);
    expect(list.body).toHaveLength(0);
  });

  it("returns 403 when a different user tries to delete the vaccine", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const pet   = await createPet(owner.token);

    const created = await request(app)
      .post(`/api/pets/${pet._id}/vaccines`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Bordetella" });

    const res = await request(app)
      .delete(`/api/pets/${pet._id}/vaccines/${created.body._id}`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent vaccine id", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .delete(`/api/pets/${pet._id}/vaccines/000000000000000000000000`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
