/**
 * E2E global setup: Odoo + n8n testcontainers on a shared Docker network.
 *
 * Three containers:
 *   PostgreSQL ← Odoo ← n8n (with our node mounted)
 *
 * The n8n container has our built node bind-mounted into its custom nodes dir.
 * Project must be built (`npm run build`) before running E2E tests.
 */
import { GenericContainer, Network, Wait } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');

export default async function globalSetup() {
	if (process.env.SKIP_CONTAINERS === 'true') {
		console.log('⏭️  Skipping E2E container start (SKIP_CONTAINERS=true)');
		return;
	}

	console.log('🚀 Starting E2E environment (PostgreSQL + Odoo + n8n)...');

	try {
		const network = await new Network().start();

		// --- PostgreSQL (for Odoo) ---
		const postgres = await new PostgreSqlContainer('postgres:15')
			.withDatabase('postgres')
			.withUsername('admin')
			.withPassword('admin')
			.withNetwork(network)
			.withNetworkAliases('postgres')
			.start();

		const pgPort = postgres.getMappedPort(5432);
		console.log(`✅ PostgreSQL ready on port ${pgPort}`);

		// --- Odoo ---
		const odoo = await new GenericContainer('odoo:17.0')
			.withNetwork(network)
			.withNetworkAliases('odoo')
			.withEnvironment({
				HOST: 'postgres',
				USER: 'admin',
				PASSWORD: 'admin',
			})
			.withCommand([
				'--database', 'odoo',
				'--init', 'base,mail,contacts',
				'--without-demo', 'all',
				'--max-cron-threads', '0',
			])
			.withExposedPorts(8069)
			.withWaitStrategy(
				Wait.forHttp('/web/health', 8069)
					.forStatusCode(200)
					.withStartupTimeout(180_000),
			)
			.start();

		const odooPort = odoo.getMappedPort(8069);
		const odooExternalUrl = `http://localhost:${odooPort}`;
		console.log(`✅ Odoo HTTP ready on port ${odooPort}`);

		// Wait for Odoo ORM to be ready (HTTP health != ORM ready)
		console.log('⏳ Waiting for Odoo session handler...');
		const authPayload = JSON.stringify({
			jsonrpc: '2.0',
			method: 'call',
			params: { db: 'odoo', login: 'admin', password: 'admin' },
		});

		let authReady = false;
		for (let attempt = 0; attempt < 30; attempt++) {
			try {
				const res = await fetch(`${odooExternalUrl}/web/session/authenticate`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: authPayload,
				});
				if (res.ok) {
					authReady = true;
					break;
				}
			} catch {
				// not ready yet
			}
			await new Promise((r) => setTimeout(r, 2000));
		}
		if (!authReady) {
			throw new Error('Odoo session handler did not become ready within 60s');
		}
		console.log('✅ Odoo session handler ready');

		// --- n8n (with our node installed via npm — real installation path) ---
		// Build a custom image that npm-installs our package into n8n,
		// exactly like a user would install a community node.
		console.log('🔨 Building n8n image with @marcfargas/n8n-nodes-odoo...');
		const n8nImage = await GenericContainer
			.fromDockerfile(projectRoot, 'tests/e2e/Dockerfile.n8n')
			.build('n8n-odoo-e2e:latest', { deleteOnExit: false });

		const n8n = await n8nImage
			.withNetwork(network)
			.withEnvironment({
				N8N_DIAGNOSTICS_ENABLED: 'false',
				N8N_PERSONALIZATION_ENABLED: 'false',
				GENERIC_TIMEZONE: 'Europe/Madrid',
				// Persist full execution data so we can retrieve it via API
				EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all',
				EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
			})
			.withExposedPorts(5678)
			.withWaitStrategy(
				Wait.forHttp('/healthz', 5678)
					.forStatusCode(200)
					.withStartupTimeout(120_000),
			)
			.start();

		const n8nPort = n8n.getMappedPort(5678);
		const n8nUrl = `http://localhost:${n8nPort}`;
		console.log(`✅ n8n ready on port ${n8nPort}`);

		// Export connection details
		process.env.N8N_URL = n8nUrl;
		process.env.ODOO_INTERNAL_URL = 'http://odoo:8069'; // n8n→odoo inside Docker network
		process.env.ODOO_URL = odooExternalUrl;              // test→odoo from host
		process.env.ODOO_DB_NAME = 'odoo';
		process.env.ODOO_DB_USER = 'admin';
		process.env.ODOO_DB_PASSWORD = 'admin';

		console.log(`✅ E2E environment ready`);
		console.log(`   n8n:  ${n8nUrl}`);
		console.log(`   Odoo: ${odooExternalUrl} (internal: http://odoo:8069)`);

		return async () => {
			console.log('🧹 Cleaning up E2E containers...');
			await n8n.stop();
			await odoo.stop();
			await postgres.stop();
			await network.stop();
			console.log('✅ E2E containers cleaned up');
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error('❌ Failed to start E2E environment:', msg);
		process.exit(1);
	}
}
