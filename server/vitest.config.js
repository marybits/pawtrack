import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./tests/globalSetup.js",
    setupFiles: ["./tests/setup.js"],
    testTimeout: 15000,
    // Run all test files sequentially in one thread so they share the
    // MongoDB memory server without racing each other's afterEach cleanup.
    // singleThread: all test files share one OS thread.
    // fileParallelism: false: files are executed one at a time (not just
    //   in the same thread — without this, Vitest still interleaves them
    //   concurrently on the event loop, causing cross-file afterEach wipes).
    singleThread: true,
    fileParallelism: false,
  },
});
