/**
 * Integration tests: Record resource against real Odoo testcontainer.
 *
 * Tests Create, Get, Search, Update, Delete, Count operations
 * using a real OdooClient but mocked n8n execution context.
 */
import { describe, it, expect, vi, beforeAll, afterAll, type Mock } from 'vitest';
import type { OdooClient } from '@marcfargas/odoo-client';
import { Odoo } from '../../nodes/Odoo/Odoo.node';
import { createMockExecuteFunctions } from '../helpers/mockExecuteFunctions';
import { getTestClient, cleanupRecords } from '../helpers/odooInstance';
import * as GenericFunctions from '../../nodes/Odoo/GenericFunctions';

vi.mock('../../nodes/Odoo/GenericFunctions', async (importOriginal) => {
	const original = await importOriginal<typeof GenericFunctions>();
	return { ...original, getClient: vi.fn(), getIntrospector: vi.fn() };
});

describe('Record operations (integration)', () => {
	let node: Odoo;
	let client: OdooClient;
	const createdIds: number[] = [];
	const prefix = `inttest_${Date.now()}`;

	beforeAll(async () => {
		node = new Odoo();
		client = await getTestClient();
		(GenericFunctions.getClient as Mock).mockResolvedValue(client);
	});

	afterAll(async () => {
		await cleanupRecords(client, 'res.partner', createdIds);
	});

	async function exec(params: Record<string, any>) {
		const ctx = createMockExecuteFunctions({ nodeParameters: params });
		return node.execute.call(ctx);
	}

	// =========================================================================
	// Create
	// =========================================================================
	it('creates a res.partner and returns the new ID', async () => {
		const result = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_create` }),
			fieldsToSet: {},
			context: '',
		});

		const id = result[0][0].json.id as number;
		expect(id).toBeGreaterThan(0);
		createdIds.push(id);
	});

	// =========================================================================
	// Get
	// =========================================================================
	it('gets a record by ID and returns correct data', async () => {
		// Create first
		const createResult = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_get` }),
			fieldsToSet: {},
			context: '',
		});
		const id = createResult[0][0].json.id as number;
		createdIds.push(id);

		// Get
		const result = await exec({
			resource: 'record',
			operation: 'get',
			model: 'res.partner',
			recordId: id,
			fields: ['name'],
			context: '',
		});

		expect(result[0][0].json.name).toBe(`${prefix}_get`);
		expect(result[0][0].json.id).toBe(id);
	});

	// =========================================================================
	// Search
	// =========================================================================
	it('searches records with domain filter', async () => {
		// Create 2 partners
		const r1 = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_search_A` }),
			fieldsToSet: {},
			context: '',
		});
		const r2 = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_search_B` }),
			fieldsToSet: {},
			context: '',
		});
		createdIds.push(r1[0][0].json.id as number, r2[0][0].json.id as number);

		// Search
		const result = await exec({
			resource: 'record',
			operation: 'search',
			model: 'res.partner',
			domainJson: JSON.stringify([['name', 'ilike', `${prefix}_search_`]]),
			fields: ['name'],
			returnAll: true,
			order: 'name asc',
			context: '',
		});

		const names = result[0].map((r: any) => r.json.name);
		expect(names).toContain(`${prefix}_search_A`);
		expect(names).toContain(`${prefix}_search_B`);
		expect(result[0].length).toBeGreaterThanOrEqual(2);
	});

	// =========================================================================
	// Update
	// =========================================================================
	it('updates a record and verifies the change', async () => {
		// Create
		const createResult = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_update_before` }),
			fieldsToSet: {},
			context: '',
		});
		const id = createResult[0][0].json.id as number;
		createdIds.push(id);

		// Update
		const updateResult = await exec({
			resource: 'record',
			operation: 'update',
			model: 'res.partner',
			recordId: id,
			valuesJson: JSON.stringify({ name: `${prefix}_update_after` }),
			fieldsToSet: {},
			context: '',
		});
		expect(updateResult[0][0].json.success).toBe(true);

		// Verify
		const getResult = await exec({
			resource: 'record',
			operation: 'get',
			model: 'res.partner',
			recordId: id,
			fields: ['name'],
			context: '',
		});
		expect(getResult[0][0].json.name).toBe(`${prefix}_update_after`);
	});

	// =========================================================================
	// Delete
	// =========================================================================
	it('deletes a record', async () => {
		// Create
		const createResult = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_delete` }),
			fieldsToSet: {},
			context: '',
		});
		const id = createResult[0][0].json.id as number;
		// Don't add to createdIds — we're deleting it

		// Delete
		const deleteResult = await exec({
			resource: 'record',
			operation: 'delete',
			model: 'res.partner',
			recordId: id,
			context: '',
		});
		expect(deleteResult[0][0].json.success).toBe(true);

		// Verify gone
		const countResult = await exec({
			resource: 'record',
			operation: 'count',
			model: 'res.partner',
			domainJson: JSON.stringify([['id', '=', id]]),
			context: '',
		});
		expect(countResult[0][0].json.count).toBe(0);
	});

	// =========================================================================
	// Count
	// =========================================================================
	it('counts records with domain', async () => {
		// Create 3 partners
		for (let i = 0; i < 3; i++) {
			const r = await exec({
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: JSON.stringify({ name: `${prefix}_count_${i}` }),
				fieldsToSet: {},
				context: '',
			});
			createdIds.push(r[0][0].json.id as number);
		}

		const result = await exec({
			resource: 'record',
			operation: 'count',
			model: 'res.partner',
			domainJson: JSON.stringify([['name', 'ilike', `${prefix}_count_`]]),
			context: '',
		});
		expect(result[0][0].json.count).toBe(3);
	});

	// =========================================================================
	// Context (tracking_disable)
	// =========================================================================
	it('creates with tracking_disable context without error', async () => {
		const result = await exec({
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: JSON.stringify({ name: `${prefix}_ctx` }),
			fieldsToSet: {},
			context: '{"tracking_disable": true}',
		});

		const id = result[0][0].json.id as number;
		expect(id).toBeGreaterThan(0);
		createdIds.push(id);
	});
});
