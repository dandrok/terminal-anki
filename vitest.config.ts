import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/config/**',
        'src/core/**',
        'src/storage/**',
        'src/state/**',
        'src/ui/charts/**',
        'src/ui/images/**',
        'src/services/**',
        'src/cli/args.ts',
        'src/cli/transfer.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
