/**
 * E2E tests for the Odoo Toolbox n8n node.
 *
 * Runs against real n8n + Odoo containers on a shared Docker network.
 * Each test creates a workflow via n8n REST API, executes it, and asserts
 * on the output data.
 *
 * Prerequisites: E2E containers running (via globalSetup.ts)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { N8nApi } from './helpers/n8nApi';

const NODE_TYPE = '@marcfargas/n8n-nodes-odoo.odooToolbox';

describe('E2E: Odoo Toolbox Node', () => {
	let api: N8nApi;
	let credentialId: string;

	beforeAll(async () => {
		const n8nUrl = process.env.N8N_URL;
		const odooInternalUrl = process.env.ODOO_INTERNAL_URL || 'http://odoo:8069';
		const db = process.env.ODOO_DB_NAME || 'odoo';
		const user = process.env.ODOO_DB_USER || 'admin';
		const pass = process.env.ODOO_DB_PASSWORD || 'admin';

		if (!n8nUrl) {
			throw new Error('N8N_URL not set — are E2E containers running?');
		}

		api = new N8nApi(n8nUrl);
		await api.waitForReady(30_000);

		// n8n requires owner setup → login → API key before public API works
		await api.initialize();

		credentialId = await api.createOdooCredential('Odoo E2E', {
			url: odooInternalUrl,
			db,
			username: user,
			password: pass,
		});
	}, 60_000);

	afterAll(async () => {
		if (credentialId) {
			try {
				await api.deleteCredential(credentialId);
			} catch {
				// best effort
			}
		}
	});

	// --------------- Helpers ---------------

	function buildWorkflow(name: string, params: Record<string, any>) {
		return {
			name,
			settings: {
				executionOrder: 'v1',
			},
			nodes: [
				{
					id: 'trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'odoo',
					name: 'Odoo',
					type: NODE_TYPE,
					typeVersion: 1,
					position: [200, 0],
					parameters: params,
					credentials: {
						odooApi: {
							id: credentialId,
							name: 'Odoo E2E',
						},
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [
						[{ node: 'Odoo', type: 'main', index: 0 }],
					],
				},
			},
		};
	}

	async function runWorkflow(
		name: string,
		params: Record<string, any>,
	): Promise<any[]> {
		const workflow = buildWorkflow(name, params);
		const workflowId = await api.createWorkflow(workflow);

		try {
			const execResult = await api.executeWorkflow(workflowId);

			// Extract execution ID from various response shapes
			const execId =
				execResult?.data?.executionId ??
				execResult?.executionId ??
				execResult?.id;

			if (!execId) {
				throw new Error(
					`No execution ID in response: ${JSON.stringify(execResult).slice(0, 500)}`,
				);
			}

			// Wait for execution to finish
			const execution = await waitForExecution(execId);

			// Extract node output
			const items = getNodeOutput(execution, 'Odoo');
			return items;
		} finally {
			await api.deleteWorkflow(workflowId);
		}
	}

	async function waitForExecution(
		execId: string,
		timeoutMs = 30_000,
	): Promise<any> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			try {
				const exec = await api.getExecution(execId);
				if (exec.finished || exec.status === 'success' || exec.status === 'error') {
					return exec;
				}
			} catch {
				// execution may not be indexed yet
			}
			await new Promise((r) => setTimeout(r, 500));
		}
		throw new Error(`Execution ${execId} did not finish within ${timeoutMs}ms`);
	}

	function getNodeOutput(execution: any, nodeName: string): any[] {
		const runData =
			execution?.data?.resultData?.runData ??
			execution?.resultData?.runData;
		if (!runData?.[nodeName]) {
			const available = Object.keys(runData || {}).join(', ');
			throw new Error(
				`No run data for node "${nodeName}". Available: [${available}]`,
			);
		}
		const nodeRuns = runData[nodeName];
		const firstRun = nodeRuns[0];
		if (!firstRun?.data?.main?.[0]) {
			throw new Error(
				`No output data for node "${nodeName}". ` +
					`Error: ${firstRun?.error?.message || 'unknown'}`,
			);
		}
		return firstRun.data.main[0];
	}

	// --------------- Tests ---------------

	it(
		'Record Create — creates a partner and returns ID',
		async () => {
			const items = await runWorkflow('e2e-record-create', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Create Test"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});

			expect(items).toHaveLength(1);
			expect(items[0].json.id).toBeGreaterThan(0);
		},
		60_000,
	);

	it(
		'Record Search — finds partners matching domain',
		async () => {
			// Create a record first so we have something to find
			await runWorkflow('e2e-search-setup', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Search Target"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});

			const items = await runWorkflow('e2e-record-search', {
				resource: 'record',
				operation: 'search',
				model: 'res.partner',
				domainJson: '[["name", "ilike", "E2E Search"]]',
				fields: ['name'],
				returnAll: false,
				limit: 10,
				offset: 0,
				order: '',
				context: '',
			});

			expect(items.length).toBeGreaterThanOrEqual(1);
			expect(items[0].json).toHaveProperty('name');
		},
		60_000,
	);

	it(
		'Record Get — fetches a record by ID',
		async () => {
			// Create first
			const createItems = await runWorkflow('e2e-get-setup', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Get Target"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});
			const recordId = createItems[0].json.id;

			// Get by ID
			const items = await runWorkflow('e2e-record-get', {
				resource: 'record',
				operation: 'get',
				model: 'res.partner',
				recordId,
				fields: ['name'],
				context: '',
			});

			expect(items).toHaveLength(1);
			expect(items[0].json.id).toBe(recordId);
			expect(items[0].json.name).toBe('E2E Get Target');
		},
		60_000,
	);

	it(
		'Record Update — modifies a record',
		async () => {
			// Create
			const createItems = await runWorkflow('e2e-update-setup', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Before Update"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});
			const recordId = createItems[0].json.id;

			// Update
			await runWorkflow('e2e-record-update', {
				resource: 'record',
				operation: 'update',
				model: 'res.partner',
				recordId,
				valuesJson: '{"name": "E2E After Update"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});

			// Verify
			const items = await runWorkflow('e2e-update-verify', {
				resource: 'record',
				operation: 'get',
				model: 'res.partner',
				recordId,
				fields: ['name'],
				context: '',
			});

			expect(items[0].json.name).toBe('E2E After Update');
		},
		90_000,
	);

	it(
		'Record Delete — removes a record',
		async () => {
			// Create
			const createItems = await runWorkflow('e2e-delete-setup', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Delete Target"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});
			const recordId = createItems[0].json.id;

			// Delete
			const deleteItems = await runWorkflow('e2e-record-delete', {
				resource: 'record',
				operation: 'delete',
				model: 'res.partner',
				recordId,
				context: '',
			});

			expect(deleteItems[0].json.success).toBe(true);

			// Verify gone
			const searchItems = await runWorkflow('e2e-delete-verify', {
				resource: 'record',
				operation: 'search',
				model: 'res.partner',
				domainJson: `[["id", "=", ${recordId}]]`,
				fields: ['name'],
				returnAll: false,
				limit: 10,
				offset: 0,
				order: '',
				context: '',
			});

			expect(searchItems).toHaveLength(0);
		},
		90_000,
	);

	it(
		'Schema List Models — returns available models',
		async () => {
			const items = await runWorkflow('e2e-schema-list', {
				resource: 'schema',
				operation: 'listModels',
				includeTransient: false,
			});

			expect(items.length).toBeGreaterThan(10);
			const models = items.map((i: any) => i.json.model);
			expect(models).toContain('res.partner');
		},
		60_000,
	);

	it(
		'Message Post Note — posts an internal note on a record',
		async () => {
			// Create a partner first
			const createItems = await runWorkflow('e2e-note-setup', {
				resource: 'record',
				operation: 'create',
				model: 'res.partner',
				valuesJson: '{"name": "E2E Note Target"}',
				fieldsToSet: {},
				context: '',
				mailOptions: {},
			});
			const recordId = createItems[0].json.id;

			// Post note
			const items = await runWorkflow('e2e-message-note', {
				resource: 'message',
				operation: 'postNote',
				model: 'res.partner',
				recordId,
				body: '<p>E2E test note</p>',
			});

			expect(items).toHaveLength(1);
			expect(items[0].json.messageId).toBeGreaterThan(0);
		},
		60_000,
	);
});
