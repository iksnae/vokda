import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    alias: {
      '$app/environment': './src/test-mocks/app-environment.ts',
      '$app/navigation': './src/test-mocks/app-navigation.ts'
    }
  }
});
