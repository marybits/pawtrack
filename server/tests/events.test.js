import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { registerUser, createPet } from "./helpers.js";

describe("POST /api/pets/:petId/events", () => {
  it("creates a meal event and returns 201", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type:  "meal",
        details: { food: "Chicken kibble", amount: 200, unit: "g", finished: "all" },
        occurredAt: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("meal");
    expect(res.body.details.food).toBe("Chicken kibble");
    expect(res.body.petId).toBe(String(pet._id));
  });

  it("returns 400 for an invalid event type", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "teleportation", occurredAt: new Date().toISOString() });

    expect(res.status).toBe(400);
  });

  it("returns 403 when a non-owner tries to log an event", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const pet   = await createPet(owner.token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/events`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ type: "meal", occurredAt: new Date().toISOString() });

    expect(res.status).toBe(403);
  });

  it("returns 401 without a token", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);

    const res = await request(app)
      .post(`/api/pets/${pet._id}/events`)
      .send({ type: "meal", occurredAt: new Date().toISOString() });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/pets/:petId/events", () => {
  it("returns all events for the pet in descending order", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);
    const base = `/api/pets/${pet._id}/events`;
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(base).set(auth).send({ type: "meal",     occurredAt: new Date().toISOString() });
    await request(app).post(base).set(auth).send({ type: "activity", occurredAt: new Date().toISOString() });
    await request(app).post(base).set(auth).send({ type: "poop",     occurredAt: new Date().toISOString() });

    const res = await request(app).get(base).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it("filters events by type", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);
    const base = `/api/pets/${pet._id}/events`;
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(base).set(auth).send({ type: "meal",     occurredAt: new Date().toISOString() });
    await request(app).post(base).set(auth).send({ type: "meal",     occurredAt: new Date().toISOString() });
    await request(app).post(base).set(auth).send({ type: "activity", occurredAt: new Date().toISOString() });

    const res = await request(app).get(`${base}?type=meal`).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((e) => e.type === "meal")).toBe(true);
  });

  it("filters events by date range using from/to params", async () => {
    const { token } = await registerUser();
    const pet = await createPet(token);
    const base = `/api/pets/${pet._id}/events`;
    const auth = { Authorization: `Bearer ${token}` };

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const lastWeek  = new Date(Date.now() - 7 * 86400000).toISOString();
    const today     = new Date().toISOString();

    // Event from last week (should be excluded)
    await request(app).post(base).set(auth).send({ type: "meal", occurredAt: lastWeek });
    // Event from yesterday and today (should be included)
    await request(app).post(base).set(auth).send({ type: "meal", occurredAt: yesterday });
    await request(app).post(base).set(auth).send({ type: "meal", occurredAt: today });

    const from = new Date(Date.now() - 2 * 86400000).toISOString();
    const res  = await request(app).get(`${base}?from=${from}`).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});
