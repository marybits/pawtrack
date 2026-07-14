import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  // Wipe every collection between tests so each test starts fresh
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});
