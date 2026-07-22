import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("POST /api/users/register", () => {
  it("returns 201 and a JWT token on success", async () => {
    const res = await request(app).post("/api/users/register").send({
      username: "mary22",
      email:    "mary@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("mary22");
    expect(res.body.user.email).toBe("mary@example.com");
    // Password must never appear in the response
    expect(res.body.user.password).toBeUndefined();
  });

  it("returns 409 when username is already taken", async () => {
    const data = { username: "duplicate", email: "first@example.com", password: "password123" };
    await request(app).post("/api/users/register").send(data);

    const res = await request(app).post("/api/users/register").send({
      ...data, email: "second@example.com",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already taken/i);
  });

  it("returns 409 when email is already taken", async () => {
    await request(app).post("/api/users/register").send({
      username: "alpha", email: "shared@example.com", password: "password123",
    });

    const res = await request(app).post("/api/users/register").send({
      username: "beta", email: "shared@example.com", password: "password123",
    });

    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/users/register").send({
      username: "nopass",
      email: "nopass@example.com",
      // password omitted
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app).post("/api/users/register").send({
      username: "shortpass",
      email:    "short@example.com",
      password: "abc",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 characters/i);
  });
});

describe("POST /api/users/login", () => {
  const creds = { username: "loginuser", email: "login@example.com", password: "mypassword" };

  it("returns 200 and a token with correct credentials", async () => {
    await request(app).post("/api/users/register").send(creds);

    const res = await request(app).post("/api/users/login").send({
      username: creds.username,
      password: creds.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 with the wrong password", async () => {
    await request(app).post("/api/users/register").send(creds);

    const res = await request(app).post("/api/users/login").send({
      username: creds.username,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it("returns 401 for an unknown username", async () => {
    const res = await request(app).post("/api/users/login").send({
      username: "nobody",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/users/login").send({ username: "someone" });
    expect(res.status).toBe(400);
  });
});
