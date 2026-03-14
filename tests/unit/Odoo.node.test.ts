/**
 * Unit tests for Odoo.node.ts execute() method.
 *
 * Tests each resource/operation with mocked OdooClient.
 * The client is injected by spying on GenericFunctions.getClient.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { OdooClient } from '@marcfargas/odoo-client';
import type { Introspector } from '@marcfargas/odoo-introspection';
import { Odoo } from '../../nodes/Odoo/Odoo.node';
import { createMockExecuteFunctions } from '../helpers/mockExecuteFunctions';
import * as GenericFunctions from '../../nodes/Odoo/GenericFunctions';

// Mock getClient to return our controlled mock
vi.mock('../../nodes/Odoo/GenericFunctions', async (importOriginal) => {
	const original = await importOriginal<typeof GenericFunctions>();
	return {
		...original,
		getClient: vi.fn(),
		getIntrospector: vi.fn(),
	};
});

describe('Odoo.node execute()', () => {
	let node: Odoo;
	let mockClient: ReturnType<typeof mockDeep<OdooClient>>;
	let mockIntrospector: ReturnType<typeof mockDeep<Introspector>>;

	beforeEach(() => {
		vi.clearAllMocks();

		node = new Odoo();
		mockClient = mockDeep<OdooClient>();
		mockIntrospector = mockDeep<Introspector>();

		(GenericFunctions.getClient as Mock).mockResolvedValue(mockClient);
		(GenericFunctions.getIntrospector as Mock).mockReturnValue(mockIntrospector);
	});

	// Helper to execute with given params
	async function executeWith(params: Record<string, any>, inputData?: any[]) {
		const ctx = createMockExecuteFunctions({
			nodeParameters: params,
			inputData: inputData ?? [{ json: {} }],
		});
		return node.execute.call(ctx);
	}

	// =========================================================================
	// Record → Search
	// =========================================================================
	describe('Record → Search', () => {
		const baseParams = {
			resource: 'record',
			operation: 'search',
			model: 'res.partner',
			domainJson: '',
			fields: [],
			returnAll: false,
			limit: 50,
			offset: 0,
			order: '',
			context: '',
		};

		it('calls searchRead with empty domain and default options', async () => {
			mockClient.searchRead.mockResolvedValue([]);
			const result = await executeWith(baseParams);

			expect(mockClient.searchRead).toHaveBeenCalledWith(
				'res.partner',
				[],
				expect.objectContaining({ limit: 50, offset: 0 }),
			);
			expect(result).toEqual([[]]);
		});

		it('passes domain JSON to searchRead', async () => {
			mockClient.searchRead.mockResolvedValue([
				{ id: 1, name: 'Test' },
			]);
			const result = await executeWith({
				...baseParams,
				domainJson: '[["name", "ilike", "test"]]',
			});

			expect(mockClient.searchRead).toHaveBeenCalledWith(
				'res.partner',
				[['name', 'ilike', 'test']],
				expect.any(Object),
			);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ id: 1, name: 'Test' });
		});

		it('passes selected fields', async () => {
			mockClient.searchRead.mockResolvedValue([]);
			await executeWith({
				...baseParams,
				fields: ['name', 'email'],
			});

			expect(mockClient.searchRead).toHaveBeenCalledWith(
				'res.partner',
				[],
				expect.objectContaining({ fields: ['name', 'email'] }),
			);
		});

		it('omits limit/offset when returnAll is true', async () => {
			mockClient.searchRead.mockResolvedValue([]);
			await executeWith({ ...baseParams, returnAll: true });

			const callOpts = (mockClient.searchRead as Mock).mock.calls[0][2];
			expect(callOpts.limit).toBeUndefined();
			expect(callOpts.offset).toBeUndefined();
		});

		it('passes order when specified', async () => {
			mockClient.searchRead.mockResolvedValue([]);
			await executeWith({ ...baseParams, order: 'name asc' });

			expect(mockClient.searchRead).toHaveBeenCalledWith(
				'res.partner',
				[],
				expect.objectContaining({ order: 'name asc' }),
			);
		});
	});

	// =========================================================================
	// Record → Get
	// =========================================================================
	describe('Record → Get', () => {
		const baseParams = {
			resource: 'record',
			operation: 'get',
			model: 'res.partner',
			recordId: 1,
			fields: [],
			context: '',
		};

		it('calls read and returns first record', async () => {
			mockClient.read.mockResolvedValue([{ id: 1, name: 'Alice' }]);
			const result = await executeWith(baseParams);

			expect(mockClient.read).toHaveBeenCalledWith('res.partner', 1, []);
			expect(result[0][0].json).toEqual({ id: 1, name: 'Alice' });
		});

		it('returns empty object when record not found', async () => {
			mockClient.read.mockResolvedValue([]);
			const result = await executeWith(baseParams);
			expect(result[0][0].json).toEqual({});
		});

		it('passes field selection', async () => {
			mockClient.read.mockResolvedValue([{ id: 1, name: 'Alice' }]);
			await executeWith({ ...baseParams, fields: ['name', 'email'] });
			expect(mockClient.read).toHaveBeenCalledWith('res.partner', 1, ['name', 'email']);
		});
	});

	// =========================================================================
	// Record → Create
	// =========================================================================
	describe('Record → Create', () => {
		const baseParams = {
			resource: 'record',
			operation: 'create',
			model: 'res.partner',
			valuesJson: '{"name": "New Partner"}',
			fieldsToSet: {},
			context: '',
		};

		it('calls create with JSON values and returns new ID', async () => {
			mockClient.create.mockResolvedValue(42);
			const result = await executeWith(baseParams);

			expect(mockClient.create).toHaveBeenCalledWith(
				'res.partner',
				{ name: 'New Partner' },
				{},
			);
			expect(result[0][0].json).toEqual({ id: 42 });
		});

		it('uses fieldsToSet when valuesJson is empty', async () => {
			mockClient.create.mockResolvedValue(43);
			await executeWith({
				...baseParams,
				valuesJson: '',
				fieldsToSet: {
					fields: [
						{ fieldName: 'name', fieldValue: 'From UI' },
						{ fieldName: 'is_company', fieldValue: 'true' },
					],
				},
			});

			expect(mockClient.create).toHaveBeenCalledWith(
				'res.partner',
				{ name: 'From UI', is_company: true },
				{},
			);
		});

		it('JSON values override fieldsToSet', async () => {
			mockClient.create.mockResolvedValue(44);
			await executeWith({
				...baseParams,
				valuesJson: '{"name": "JSON wins"}',
				fieldsToSet: {
					fields: [{ fieldName: 'name', fieldValue: 'UI loses' }],
				},
			});

			expect(mockClient.create).toHaveBeenCalledWith(
				'res.partner',
				{ name: 'JSON wins' },
				{},
			);
		});

		it('passes context to create', async () => {
			mockClient.create.mockResolvedValue(45);
			await executeWith({
				...baseParams,
				context: '{"tracking_disable": true}',
			});

			expect(mockClient.create).toHaveBeenCalledWith(
				'res.partner',
				{ name: 'New Partner' },
				{ tracking_disable: true },
			);
		});

		it('throws on invalid values JSON', async () => {
			const ctx = createMockExecuteFunctions({
				nodeParameters: {
					...baseParams,
					valuesJson: '{not valid json}',
				},
			});

			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Values JSON must be a valid JSON object',
			);
		});
	});

	// =========================================================================
	// Record → Update
	// =========================================================================
	describe('Record → Update', () => {
		const baseParams = {
			resource: 'record',
			operation: 'update',
			model: 'res.partner',
			recordId: 10,
			valuesJson: '{"name": "Updated"}',
			fieldsToSet: {},
			context: '',
		};

		it('calls write and returns success', async () => {
			mockClient.write.mockResolvedValue(true);
			const result = await executeWith(baseParams);

			expect(mockClient.write).toHaveBeenCalledWith(
				'res.partner',
				10,
				{ name: 'Updated' },
				{},
			);
			expect(result[0][0].json).toEqual({ id: 10, success: true });
		});

		it('passes context to write', async () => {
			mockClient.write.mockResolvedValue(true);
			await executeWith({
				...baseParams,
				context: '{"mail_notrack": true}',
			});

			expect(mockClient.write).toHaveBeenCalledWith(
				'res.partner',
				10,
				{ name: 'Updated' },
				{ mail_notrack: true },
			);
		});
	});

	// =========================================================================
	// Record → Delete
	// =========================================================================
	describe('Record → Delete', () => {
		it('calls unlink and returns success', async () => {
			mockClient.unlink.mockResolvedValue(true);
			const result = await executeWith({
				resource: 'record',
				operation: 'delete',
				model: 'res.partner',
				recordId: 99,
				context: '',
			});

			expect(mockClient.unlink).toHaveBeenCalledWith('res.partner', 99);
			expect(result[0][0].json).toEqual({ id: 99, success: true });
		});
	});

	// =========================================================================
	// Record → Count
	// =========================================================================
	describe('Record → Count', () => {
		it('calls searchCount and returns count', async () => {
			mockClient.searchCount.mockResolvedValue(42);
			const result = await executeWith({
				resource: 'record',
				operation: 'count',
				model: 'res.partner',
				domainJson: '[["active", "=", true]]',
				context: '',
			});

			expect(mockClient.searchCount).toHaveBeenCalledWith(
				'res.partner',
				[['active', '=', true]],
			);
			expect(result[0][0].json).toEqual({ count: 42 });
		});
	});

	// =========================================================================
	// Method → Call
	// =========================================================================
	describe('Method → Call', () => {
		const baseParams = {
			resource: 'method',
			operation: 'call',
			model: 'sale.order',
			method: 'action_confirm',
			recordIds: '1,2,3',
			args: '',
			kwargs: '',
			context: '',
		};

		it('calls method with record IDs', async () => {
			mockClient.call.mockResolvedValue(true);
			const result = await executeWith(baseParams);

			expect(mockClient.call).toHaveBeenCalledWith(
				'sale.order',
				'action_confirm',
				[[1, 2, 3]],
				{},
			);
			// Primitive results get wrapped
			expect(result[0][0].json).toEqual({ result: true });
		});

		it('passes extra positional args', async () => {
			mockClient.call.mockResolvedValue({ state: 'done' });
			await executeWith({
				...baseParams,
				args: '["extra_arg", 42]',
			});

			expect(mockClient.call).toHaveBeenCalledWith(
				'sale.order',
				'action_confirm',
				[[1, 2, 3], 'extra_arg', 42],
				{},
			);
		});

		it('passes kwargs and merges context', async () => {
			mockClient.call.mockResolvedValue({});
			await executeWith({
				...baseParams,
				kwargs: '{"force": true}',
				context: '{"lang": "es_ES"}',
			});

			expect(mockClient.call).toHaveBeenCalledWith(
				'sale.order',
				'action_confirm',
				[[1, 2, 3]],
				{ force: true, context: { lang: 'es_ES' } },
			);
		});

		it('throws on invalid args JSON', async () => {
			const ctx = createMockExecuteFunctions({
				nodeParameters: { ...baseParams, args: 'not array' },
			});
			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Arguments must be a valid JSON array',
			);
		});

		it('throws on invalid kwargs JSON', async () => {
			const ctx = createMockExecuteFunctions({
				nodeParameters: { ...baseParams, kwargs: '{bad}' },
			});
			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Keyword arguments must be a valid JSON object',
			);
		});

		it('handles empty recordIds', async () => {
			mockClient.call.mockResolvedValue(null);
			await executeWith({ ...baseParams, recordIds: '' });

			// No ids pushed to args
			expect(mockClient.call).toHaveBeenCalledWith(
				'sale.order',
				'action_confirm',
				[],
				{},
			);
		});
	});

	// =========================================================================
	// Message → Post Note / Post Message
	// =========================================================================
	describe('Message → Post Note', () => {
		it('calls mail.postInternalNote', async () => {
			mockClient.mail.postInternalNote.mockResolvedValue(100);
			const result = await executeWith({
				resource: 'message',
				operation: 'postNote',
				model: 'res.partner',
				recordId: 5,
				body: '<p>Hello</p>',
			});

			expect(mockClient.mail.postInternalNote).toHaveBeenCalledWith(
				'res.partner',
				5,
				'<p>Hello</p>',
			);
			expect(result[0][0].json).toEqual({ messageId: 100 });
		});
	});

	describe('Message → Post Message', () => {
		it('calls mail.postOpenMessage', async () => {
			mockClient.mail.postOpenMessage.mockResolvedValue(101);
			const result = await executeWith({
				resource: 'message',
				operation: 'postMessage',
				model: 'res.partner',
				recordId: 5,
				body: '<p>Public message</p>',
			});

			expect(mockClient.mail.postOpenMessage).toHaveBeenCalledWith(
				'res.partner',
				5,
				'<p>Public message</p>',
			);
			expect(result[0][0].json).toEqual({ messageId: 101 });
		});
	});

	// =========================================================================
	// Property → Get / Update
	// =========================================================================
	describe('Property → Get', () => {
		it('reads properties field and returns it', async () => {
			mockClient.read.mockResolvedValue([
				{ id: 7, properties: [{ name: 'color', value: 'red' }] },
			]);
			const result = await executeWith({
				resource: 'property',
				operation: 'get',
				model: 'res.partner',
				recordId: 7,
				propertiesField: 'properties',
			});

			expect(mockClient.read).toHaveBeenCalledWith('res.partner', 7, ['properties']);
			expect(result[0][0].json).toEqual({
				id: 7,
				properties: [{ name: 'color', value: 'red' }],
			});
		});

		it('returns empty object when record not found', async () => {
			mockClient.read.mockResolvedValue([]);
			const result = await executeWith({
				resource: 'property',
				operation: 'get',
				model: 'res.partner',
				recordId: 999,
				propertiesField: 'properties',
			});

			expect(result[0][0].json).toEqual({});
		});
	});

	describe('Property → Update', () => {
		it('calls properties.updateSafely', async () => {
			mockClient.properties.updateSafely.mockResolvedValue(undefined as any);
			const result = await executeWith({
				resource: 'property',
				operation: 'update',
				model: 'res.partner',
				recordId: 7,
				propertiesField: 'properties',
				propertyValues: '{"color": "blue"}',
			});

			expect(mockClient.properties.updateSafely).toHaveBeenCalledWith(
				'res.partner',
				7,
				'properties',
				{ color: 'blue' },
			);
			expect(result[0][0].json).toEqual({
				id: 7,
				success: true,
				updated: ['color'],
			});
		});

		it('throws on invalid property values JSON', async () => {
			const ctx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'property',
					operation: 'update',
					model: 'res.partner',
					recordId: 7,
					propertiesField: 'properties',
					propertyValues: 'not json',
				},
			});
			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Property values must be valid JSON',
			);
		});
	});

	// =========================================================================
	// Schema → List Models / Get Fields
	// =========================================================================
	describe('Schema → List Models', () => {
		it('calls introspector.getModels', async () => {
			mockIntrospector.getModels.mockResolvedValue([
				{ name: 'Contact', model: 'res.partner' },
				{ name: 'Product', model: 'product.product' },
			] as any);

			const result = await executeWith({
				resource: 'schema',
				operation: 'listModels',
				includeTransient: false,
			});

			expect(GenericFunctions.getIntrospector).toHaveBeenCalledWith(mockClient);
			expect(mockIntrospector.getModels).toHaveBeenCalledWith({
				includeTransient: false,
			});
			expect(result[0]).toHaveLength(2);
		});
	});

	describe('Schema → Get Fields', () => {
		it('calls introspector.getFields', async () => {
			mockIntrospector.getFields.mockResolvedValue([
				{ name: 'name', ttype: 'char', required: true },
			] as any);

			const result = await executeWith({
				resource: 'schema',
				operation: 'getFields',
				model: 'res.partner',
			});

			expect(mockIntrospector.getFields).toHaveBeenCalledWith('res.partner');
			expect(result[0]).toHaveLength(1);
		});
	});

	// =========================================================================
	// Error handling
	// =========================================================================
	describe('Error handling', () => {
		it('throws NodeOperationError on client failure', async () => {
			mockClient.searchRead.mockRejectedValue(new Error('Connection refused'));

			const ctx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'record',
					operation: 'search',
					model: 'res.partner',
					domainJson: '',
					fields: [],
					returnAll: false,
					limit: 50,
					offset: 0,
					order: '',
					context: '',
				},
			});

			await expect(node.execute.call(ctx)).rejects.toThrow('Connection refused');
		});

		it('continues on fail when enabled', async () => {
			mockClient.searchRead.mockRejectedValue(new Error('Odoo down'));

			const ctx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'record',
					operation: 'search',
					model: 'res.partner',
					domainJson: '',
					fields: [],
					returnAll: false,
					limit: 50,
					offset: 0,
					order: '',
					context: '',
				},
				continueOnFail: true,
			});

			const result = await node.execute.call(ctx);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'Odoo down' });
		});
	});

	// =========================================================================
	// Multi-item execution
	// =========================================================================
	describe('Multi-item execution', () => {
		it('processes multiple input items', async () => {
			mockClient.read.mockResolvedValueOnce([{ id: 1, name: 'Alice' }]);
			mockClient.read.mockResolvedValueOnce([{ id: 2, name: 'Bob' }]);

			const result = await executeWith(
				{
					resource: 'record',
					operation: 'get',
					model: 'res.partner',
					recordId: 1, // same for both items in this simple mock
					fields: [],
					context: '',
				},
				[{ json: {} }, { json: {} }],
			);

			expect(mockClient.read).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
		});
	});
});
