import { MongoMemoryServer } from "mongodb-memory-server";

let mongod;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET  = "test-secret-pawtrack";
}

export async function teardown() {
  await mongod.stop();
}
