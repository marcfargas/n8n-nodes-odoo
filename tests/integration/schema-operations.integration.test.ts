/**
 * Integration tests: Schema resource against real Odoo testcontainer.
 *
 * Tests List Models and Get Fields via real Introspector.
 */
import { describe, it, expect, vi, beforeAll, type Mock } from 'vitest';
import type { OdooClient } from '@marcfargas/odoo-client';
import { Introspector } from '@marcfargas/odoo-introspection';
import { Odoo } from '../../nodes/Odoo/Odoo.node';
import { createMockExecuteFunctions } from '../helpers/mockExecuteFunctions';
import { getTestClient } from '../helpers/odooInstance';
import * as GenericFunctions from '../../nodes/Odoo/GenericFunctions';

vi.mock('../../nodes/Odoo/GenericFunctions', async (importOriginal) => {
	const original = await importOriginal<typeof GenericFunctions>();
	return { ...original, getClient: vi.fn(), getIntrospector: vi.fn() };
});

describe('Schema operations (integration)', () => {
	let node: Odoo;
	let client: OdooClient;

	beforeAll(async () => {
		node = new Odoo();
		client = await getTestClient();
		(GenericFunctions.getClient as Mock).mockResolvedValue(client);

		// Return a REAL Introspector backed by the real client
		const introspector = new Introspector(client);
		(GenericFunctions.getIntrospector as Mock).mockReturnValue(introspector);
	});

	async function exec(params: Record<string, any>) {
		const ctx = createMockExecuteFunctions({ nodeParameters: params });
		return node.execute.call(ctx);
	}

	describe('List Models', () => {
		it('returns an array of models including res.partner', async () => {
			const result = await exec({
				resource: 'schema',
				operation: 'listModels',
				includeTransient: false,
			});

			const models = result[0].map((r: any) => r.json);
			expect(models.length).toBeGreaterThan(0);
			expect(models[0]).toHaveProperty('model');
			expect(models[0]).toHaveProperty('name');

			const modelNames = models.map((m: any) => m.model);
			expect(modelNames).toContain('res.partner');
		});

		it('works with includeTransient=true', async () => {
			const result = await exec({
				resource: 'schema',
				operation: 'listModels',
				includeTransient: true,
			});

			expect(result[0].length).toBeGreaterThan(0);
		});
	});

	describe('Get Fields', () => {
		it('returns fields for res.partner with name as char', async () => {
			const result = await exec({
				resource: 'schema',
				operation: 'getFields',
				model: 'res.partner',
			});

			const fields = result[0].map((r: any) => r.json);
			expect(fields.length).toBeGreaterThan(0);

			const nameField = fields.find((f: any) => f.name === 'name');
			expect(nameField).toBeDefined();
			expect(nameField.ttype).toBe('char');
		});

		it('includes field metadata (required, readonly, relation)', async () => {
			const result = await exec({
				resource: 'schema',
				operation: 'getFields',
				model: 'res.partner',
			});

			const fields = result[0].map((r: any) => r.json);
			const partnerIdField = fields.find((f: any) => f.name === 'parent_id');

			if (partnerIdField) {
				expect(partnerIdField).toHaveProperty('ttype');
				expect(partnerIdField).toHaveProperty('relation');
			}
		});
	});
});
