/**
 * Helpers for integration tests that need a real OdooClient.
 *
 * Connection details come from globalSetup (process.env).
 */
import { OdooClient } from '@marcfargas/odoo-client';

/**
 * Create and authenticate an OdooClient using env vars from globalSetup.
 */
export async function getTestClient(): Promise<OdooClient> {
	const url = process.env.ODOO_URL || 'http://localhost:8069';
	const database = process.env.ODOO_DB_NAME || 'odoo';
	const username = process.env.ODOO_DB_USER || 'admin';
	const password = process.env.ODOO_DB_PASSWORD || 'admin';

	const client = new OdooClient({ url, database, username, password });
	await client.authenticate();
	return client;
}

/**
 * Create records and return their IDs. Caller should clean up.
 */
export async function createTestRecords(
	client: OdooClient,
	model: string,
	values: Record<string, any>[],
): Promise<number[]> {
	const ids: number[] = [];
	for (const val of values) {
		const id = await client.create(model, val);
		ids.push(id);
	}
	return ids;
}

/**
 * Delete test records (best-effort, for cleanup).
 */
export async function cleanupRecords(
	client: OdooClient,
	model: string,
	ids: number[],
): Promise<void> {
	for (const id of ids) {
		try {
			await client.unlink(model, id);
		} catch {
			// ignore — record may already be deleted
		}
	}
}
