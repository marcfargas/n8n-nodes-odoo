import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 10_000,
		root: '.',
		include: ['tests/**/*.test.ts'],
		exclude: ['tests/**/*.integration.test.ts', 'tests/**/*.e2e.test.ts'],
		setupFiles: ['./tests/helpers/setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['nodes/**/*.ts', 'credentials/**/*.ts'],
			exclude: ['**/descriptions/**'],
		},
	},
	server: {
		// Suppress noisy n8n-workflow sourcemap warnings
		sourcemapIgnoreList: () => true,
	},
});
