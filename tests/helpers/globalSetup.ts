/**
 * Vitest global setup for integration tests.
 *
 * Spins up an Odoo testcontainer using @marcfargas/odoo-testcontainers.
 * Exports Odoo connection details via process.env for tests.
 *
 * The container starts with base + mail modules (enough for all our
 * node operations: CRUD, messages, schema introspection).
 */
import { startOdoo, type StartedOdooContainer } from '@marcfargas/odoo-testcontainers';

let container: StartedOdooContainer | undefined;

export default async function globalSetup() {
	const skipContainers = process.env.SKIP_CONTAINERS === 'true';

	if (skipContainers) {
		// Use externally provided Odoo (e.g., already running container)
		console.log('⏭️  Skipping container start (SKIP_CONTAINERS=true)');
		console.log(`   Using Odoo at ${process.env.ODOO_URL || 'http://localhost:8069'}`);
		return;
	}

	console.log('🚀 Starting Odoo testcontainer for integration tests...');

	try {
		container = await startOdoo({
			modules: ['base', 'mail', 'contacts'],
			startupTimeout: 180_000,
		});

		process.env.ODOO_URL = container.url;
		process.env.ODOO_DB_NAME = container.database;
		process.env.ODOO_DB_USER = 'admin';
		process.env.ODOO_DB_PASSWORD = 'admin';

		console.log(`✅ Odoo ready at ${container.url} (db: ${container.database})`);

		return async () => {
			console.log('🧹 Cleaning up Odoo testcontainer...');
			await container!.cleanup();
			console.log('✅ Testcontainer cleaned up');
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error('❌ Failed to start Odoo testcontainer:', msg);
		process.exit(1);
	}
}
