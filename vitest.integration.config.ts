import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 60_000,
		hookTimeout: 120_000,
		root: '.',
		include: ['tests/**/*.integration.test.ts'],
		globalSetup: './tests/helpers/globalSetup.ts',
		setupFiles: ['./tests/helpers/setup.ts'],
		sequence: { concurrent: false },
		pool: 'forks',
		fileParallelism: false,
	},
});
