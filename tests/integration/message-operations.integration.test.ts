/**
 * Integration tests: Message resource against real Odoo testcontainer.
 *
 * Tests Post Note and Post Message operations via Odoo chatter.
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

describe('Message operations (integration)', () => {
	let node: Odoo;
	let client: OdooClient;
	let partnerId: number;
	const createdIds: number[] = [];

	beforeAll(async () => {
		node = new Odoo();
		client = await getTestClient();
		(GenericFunctions.getClient as Mock).mockResolvedValue(client);

		// Create a partner to post messages on
		partnerId = await client.create('res.partner', {
			name: `msg_test_${Date.now()}`,
		});
		createdIds.push(partnerId);
	});

	afterAll(async () => {
		await cleanupRecords(client, 'res.partner', createdIds);
	});

	async function exec(params: Record<string, any>) {
		const ctx = createMockExecuteFunctions({ nodeParameters: params });
		return node.execute.call(ctx);
	}

	it('posts an internal note', async () => {
		const result = await exec({
			resource: 'message',
			operation: 'postNote',
			model: 'res.partner',
			recordId: partnerId,
			body: '<p>Integration test internal note</p>',
		});

		expect(result[0][0].json.messageId).toBeGreaterThan(0);
	});

	it('posts an open message', async () => {
		const result = await exec({
			resource: 'message',
			operation: 'postMessage',
			model: 'res.partner',
			recordId: partnerId,
			body: '<p>Integration test open message</p>',
		});

		expect(result[0][0].json.messageId).toBeGreaterThan(0);
	});
});
