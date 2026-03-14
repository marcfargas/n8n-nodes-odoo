/**
 * Mock factory for IExecuteFunctions.
 *
 * Creates a lightweight mock that satisfies the n8n execution context interface
 * for unit testing node execute() methods. Uses vitest-mock-extended for deep mocking,
 * then overrides the methods our node actually calls with predictable behavior.
 *
 * Usage:
 *   const ctx = createMockExecuteFunctions({
 *     nodeParameters: { resource: 'record', operation: 'search', model: 'res.partner' },
 *     credentials: { url: '...', db: '...', username: '...', password: '...' },
 *   });
 */
import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	ICredentialDataDecryptedObject,
	INode,
	NodeExecutionWithMetadata,
	IDataObject,
} from 'n8n-workflow';

export interface MockExecuteOptions {
	/** Parameter values keyed by name. Supports per-item overrides via Map<number, value>. */
	nodeParameters?: Record<string, any>;
	/** Credentials returned by getCredentials('odooApi') */
	credentials?: ICredentialDataDecryptedObject;
	/** Input data items */
	inputData?: INodeExecutionData[];
	/** Whether continueOnFail is enabled */
	continueOnFail?: boolean;
}

const DEFAULT_CREDENTIALS: ICredentialDataDecryptedObject = {
	url: 'http://localhost:8069',
	db: 'odoo',
	username: 'admin',
	password: 'admin',
};

const DEFAULT_NODE: INode = {
	id: 'test-node-id',
	name: 'Odoo Toolbox',
	type: 'n8n-nodes-odoo.odooToolbox',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/**
 * Create a mock IExecuteFunctions for unit testing.
 */
export function createMockExecuteFunctions(
	options: MockExecuteOptions = {},
): IExecuteFunctions {
	const {
		nodeParameters = {},
		credentials = DEFAULT_CREDENTIALS,
		inputData = [{ json: {} }],
		continueOnFail: shouldContinueOnFail = false,
	} = options;

	// Deep mock gives us all nested properties (helpers, etc.)
	const ctx = mockDeep<IExecuteFunctions>();

	// --- getNodeParameter ---
	// Supports: getNodeParameter(name, itemIndex, fallback?)
	const getNodeParameter = (name: string, _itemIndex: number, fallback?: any) => {
		const val = nodeParameters[name];
		if (val === undefined) {
			if (fallback !== undefined) return fallback;
			throw new Error(`Parameter "${name}" not found in mock. Set it in nodeParameters.`);
		}
		return val;
	};
	(ctx.getNodeParameter as any).mockImplementation(getNodeParameter);

	// --- getInputData ---
	(ctx.getInputData as any).mockReturnValue(inputData);

	// --- getCredentials ---
	(ctx.getCredentials as any).mockResolvedValue(credentials);

	// --- getNode ---
	(ctx.getNode as any).mockReturnValue(DEFAULT_NODE);

	// --- continueOnFail ---
	(ctx.continueOnFail as any).mockReturnValue(shouldContinueOnFail);

	// --- helpers.returnJsonArray ---
	ctx.helpers.returnJsonArray.mockImplementation(
		(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] => {
			const arr = Array.isArray(jsonData) ? jsonData : [jsonData];
			return arr.map((json) => ({ json }));
		},
	);

	// --- helpers.constructExecutionMetaData ---
	ctx.helpers.constructExecutionMetaData.mockImplementation(
		(
			inputDataItems: INodeExecutionData[],
			_options: { itemData: any },
		): NodeExecutionWithMetadata[] => {
			return inputDataItems as NodeExecutionWithMetadata[];
		},
	);

	return ctx;
}
