import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10000,
    // Every integration test file shares one live Postgres database and
    // TRUNCATEs it in beforeEach. Running test files in parallel (Vitest's
    // default) lets one file's truncate wipe out data another file is still
    // using mid-request — e.g. a product created in orders.test.ts getting
    // deleted by products.test.ts's beforeEach right before the order is
    // placed, surfacing as a flaky 404. Running files sequentially avoids
    // that cross-file interference entirely.
    fileParallelism: false,
  },
});
