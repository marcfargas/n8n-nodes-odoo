import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 120_000,
		hookTimeout: 180_000,
		root: '.',
		include: ['tests/e2e/**/*.e2e.test.ts'],
		globalSetup: './tests/e2e/globalSetup.ts',
		setupFiles: ['./tests/helpers/setup.ts'],
		sequence: { concurrent: false },
		pool: 'forks',
		fileParallelism: false,
	},
});
