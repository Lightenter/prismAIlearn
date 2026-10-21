import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@prismai\/(.*)$/, replacement: resolve(process.cwd(), 'packages/$1/src/index.ts') }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
