/**
 * Unit tests for OdooTrigger.node.ts poll() method.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import type { IPollFunctions } from 'n8n-workflow';
import type { OdooClient } from '@marcfargas/odoo-client';
import { OdooTrigger } from '../../nodes/Odoo/OdooTrigger.node';
import * as GenericFunctions from '../../nodes/Odoo/GenericFunctions';

vi.mock('../../nodes/Odoo/GenericFunctions', async (importOriginal) => {
	const original = await importOriginal<typeof GenericFunctions>();
	return {
		...original,
		getClient: vi.fn(),
	};
});

describe('OdooTrigger.node poll()', () => {
	let trigger: OdooTrigger;
	let mockClient: ReturnType<typeof mockDeep<OdooClient>>;
	let mockCtx: ReturnType<typeof mockDeep<IPollFunctions>>;
	let staticData: Record<string, any>;

	beforeEach(() => {
		vi.clearAllMocks();

		trigger = new OdooTrigger();
		mockClient = mockDeep<OdooClient>();
		(GenericFunctions.getClient as Mock).mockResolvedValue(mockClient);

		mockCtx = mockDeep<IPollFunctions>();
		staticData = {};

		// Setup mock poll context
		const getNodeParameter = (name: string, fallback?: any) => {
			const params: Record<string, any> = {
				model: 'res.partner',
				domainJson: '',
				fields: '',
				context: '',
			};
			return params[name] ?? fallback;
		};
		(mockCtx.getNodeParameter as any).mockImplementation(getNodeParameter);
		(mockCtx.getWorkflowStaticData as any).mockReturnValue(staticData);
		mockCtx.helpers.returnJsonArray.mockImplementation((data: any) => {
			const arr = Array.isArray(data) ? data : [data];
			return arr.map((json: any) => ({ json }));
		});
	});

	it('returns null when no records found', async () => {
		mockClient.searchRead.mockResolvedValue([]);
		const result = await trigger.poll.call(mockCtx);
		expect(result).toBeNull();
	});

	it('returns records and updates lastPoll', async () => {
		mockClient.searchRead.mockResolvedValue([
			{ id: 1, name: 'Alice', write_date: '2025-01-01 12:00:00' },
			{ id: 2, name: 'Bob', write_date: '2025-01-01 13:00:00' },
		]);

		const result = await trigger.poll.call(mockCtx);

		expect(result).not.toBeNull();
		expect(result![0]).toHaveLength(2);
		expect(staticData.lastPoll).toBe('2025-01-01 13:00:00');
	});

	it('includes write_date filter on subsequent polls', async () => {
		staticData.lastPoll = '2025-01-01 10:00:00';
		mockClient.searchRead.mockResolvedValue([]);

		await trigger.poll.call(mockCtx);

		const calledDomain = (mockClient.searchRead as Mock).mock.calls[0][1];
		expect(calledDomain).toContainEqual(['write_date', '>', '2025-01-01 10:00:00']);
	});

	it('sets lastPoll to now on first empty poll', async () => {
		mockClient.searchRead.mockResolvedValue([]);
		await trigger.poll.call(mockCtx);

		expect(staticData.lastPoll).toBeDefined();
		// Should be an ISO-ish datetime string
		expect(staticData.lastPoll).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
	});

	it('does not reset lastPoll on subsequent empty poll', async () => {
		staticData.lastPoll = '2025-01-01 10:00:00';
		mockClient.searchRead.mockResolvedValue([]);

		await trigger.poll.call(mockCtx);
		expect(staticData.lastPoll).toBe('2025-01-01 10:00:00');
	});

	it('orders results by write_date asc', async () => {
		mockClient.searchRead.mockResolvedValue([]);
		await trigger.poll.call(mockCtx);

		const callOpts = (mockClient.searchRead as Mock).mock.calls[0][2];
		expect(callOpts.order).toBe('write_date asc');
	});
});
