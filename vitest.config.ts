import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types.ts'],
      thresholds: {
        // 100% coverage is a release gate: every branch must be exercised.
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
        perFile: true,
      },
    },
  },
});
