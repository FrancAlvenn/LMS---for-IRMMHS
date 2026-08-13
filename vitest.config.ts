import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Node environment, not jsdom: this project's test suite targets pure
// business logic (the grading engine, validators, date/term helpers), not
// components. See CLAUDE.md / playbook Phase 10 on why the grading engine
// in particular needs exhaustive coverage.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
