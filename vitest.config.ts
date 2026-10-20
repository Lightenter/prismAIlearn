import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@prismai\/(.*)$/, replacement: '/home/ubuntu/prismai-architecture-git/packages/$1/src/index.ts' }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
