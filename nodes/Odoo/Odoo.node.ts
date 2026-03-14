/**
 * Odoo Toolbox — advanced Odoo node for n8n.
 *
 * Schema-aware CRUD, method calls, chatter messaging, property fields,
 * and runtime introspection. Powered by @marcfargas/odoo-client and
 * @marcfargas/odoo-introspection.
 *
 * Replaces and extends the built-in n8n Odoo node.
 */
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	recordOperations,
	recordDescription,
	methodOperations,
	methodDescription,
	messageOperations,
	messageDescription,
	propertyOperations,
	propertyDescription,
	schemaOperations,
	schemaDescription,
} from './descriptions';

import {
	getClient,
	getIntrospector,
	buildDomain,
	parseContext,
} from './GenericFunctions';

export class Odoo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo Toolbox',
		name: 'odooToolbox',
		icon: 'file:odoo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Advanced Odoo integration — schema-aware CRUD, method calls, chatter, properties, and introspection',
		defaults: {
			name: 'Odoo Toolbox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'odooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Record',
						value: 'record',
						description: 'CRUD operations on any Odoo model',
					},
					{
						name: 'Method',
						value: 'method',
						description: 'Call any model method (action_confirm, etc.)',
					},
					{
						name: 'Message',
						value: 'message',
						description: 'Post notes and messages via Odoo chatter',
					},
					{
						name: 'Property',
						value: 'property',
						description: 'Read/write Odoo 17+ dynamic property fields',
					},
					{
						name: 'Schema',
						value: 'schema',
						description: 'Introspect models and fields at runtime',
					},
				],
				default: 'record',
			},
			...recordOperations,
			...recordDescription,
			...methodOperations,
			...methodDescription,
			...messageOperations,
			...messageDescription,
			...propertyOperations,
			...propertyDescription,
			...schemaOperations,
			...schemaDescription,
		],
	};

	methods = {
		loadOptions: {
			/**
			 * List all Odoo models for the model picker dropdown.
			 */
			async getModels(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const client = await getClient(this);
				const introspector = getIntrospector(client);
				const models = await introspector.getModels();

				return models
					.map((m) => ({
						name: `${m.name} (${m.model})`,
						value: m.model,
						description: `model: ${m.model}`,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			/**
			 * List fields for the currently selected model.
			 *
			 * Shows field name, type, and whether it's required — much more
			 * informative than the built-in node's flat name list.
			 */
			async getModelFields(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const model = this.getCurrentNodeParameter('model') as string;
				if (!model) return [];

				const client = await getClient(this);
				const introspector = getIntrospector(client);
				const fields = await introspector.getFields(model);

				return fields
					.map((f) => ({
						name: `${f.field_description} (${f.name})`,
						value: f.name,
						description: `type: ${f.ttype}${f.required ? ', required' : ''}${f.readonly ? ', readonly' : ''}${f.relation ? `, → ${f.relation}` : ''}`,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const client = await getClient(this);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				// ===========================
				// Record
				// ===========================
				if (resource === 'record') {
					const model = this.getNodeParameter('model', i) as string;
					const baseContext = parseContext(
						this.getNodeParameter('context', i, '') as string,
					);

					// Merge mail options into context for create/update
					const context =
						operation === 'create' || operation === 'update'
							? mergeMailOptions(
									baseContext,
									this.getNodeParameter('mailOptions', i, {}) as Record<
										string,
										any
									>,
								)
							: baseContext;

					if (operation === 'search') {
						const domainJson = this.getNodeParameter('domainJson', i, '') as string;
						const domain = buildDomain(undefined, domainJson);
						const fields = this.getNodeParameter('fields', i, []) as string[];
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const order = this.getNodeParameter('order', i, '') as string;

						const opts: any = {
							fields: fields.length > 0 ? fields : undefined,
							order: order || undefined,
						};

						if (!returnAll) {
							opts.limit = this.getNodeParameter('limit', i, 50) as number;
							opts.offset = this.getNodeParameter('offset', i, 0) as number;
						}

						responseData = await client.searchRead(model, domain, opts);
					}

					if (operation === 'get') {
						const recordId = this.getNodeParameter('recordId', i) as number;
						const fields = this.getNodeParameter('fields', i, []) as string[];
						const records = await client.read(model, recordId, fields);
						responseData = records[0] || {};
					}

					if (operation === 'create') {
						const values = resolveValues(this, i);
						responseData = { id: await client.create(model, values, context || {}) };
					}

					if (operation === 'update') {
						const recordId = this.getNodeParameter('recordId', i) as number;
						const values = resolveValues(this, i);
						await client.write(model, recordId, values, context || {});
						responseData = { id: recordId, success: true };
					}

					if (operation === 'delete') {
						const recordId = this.getNodeParameter('recordId', i) as number;
						await client.unlink(model, recordId);
						responseData = { id: recordId, success: true };
					}

					if (operation === 'count') {
						const domainJson = this.getNodeParameter('domainJson', i, '') as string;
						const domain = buildDomain(undefined, domainJson);
						const count = await client.searchCount(model, domain);
						responseData = { count };
					}
				}

				// ===========================
				// Method
				// ===========================
				if (resource === 'method') {
					const model = this.getNodeParameter('model', i) as string;
					const method = this.getNodeParameter('method', i) as string;
					const recordIdsStr = this.getNodeParameter('recordIds', i, '') as string;
					const argsStr = this.getNodeParameter('args', i, '') as string;
					const kwargsStr = this.getNodeParameter('kwargs', i, '') as string;
					const context = parseContext(
						this.getNodeParameter('context', i, '') as string,
					);

					// Build positional args: [ids, ...extraArgs]
					const args: any[] = [];
					if (recordIdsStr.trim()) {
						const ids = recordIdsStr
							.split(',')
							.map((s) => parseInt(s.trim(), 10))
							.filter((n) => !isNaN(n));
						args.push(ids);
					}
					if (argsStr.trim()) {
						try {
							const extra = JSON.parse(argsStr);
							if (Array.isArray(extra)) {
								args.push(...extra);
							}
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Arguments must be a valid JSON array',
								{ itemIndex: i },
							);
						}
					}

					// Build kwargs
					let kwargs: Record<string, any> = {};
					if (kwargsStr.trim()) {
						try {
							kwargs = JSON.parse(kwargsStr);
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Keyword arguments must be a valid JSON object',
								{ itemIndex: i },
							);
						}
					}
					if (context) {
						kwargs.context = { ...kwargs.context, ...context };
					}

					responseData = await client.call(model, method, args, kwargs);
					// Normalize: if result is not an object, wrap it
					if (typeof responseData !== 'object' || responseData === null) {
						responseData = { result: responseData };
					}
				}

				// ===========================
				// Message
				// ===========================
				if (resource === 'message') {
					const model = this.getNodeParameter('model', i) as string;
					const recordId = this.getNodeParameter('recordId', i) as number;
					const body = this.getNodeParameter('body', i) as string;

					if (operation === 'postNote') {
						const messageId = await client.mail.postInternalNote(
							model,
							recordId,
							body,
						);
						responseData = { messageId };
					}

					if (operation === 'postMessage') {
						const messageId = await client.mail.postOpenMessage(
							model,
							recordId,
							body,
						);
						responseData = { messageId };
					}
				}

				// ===========================
				// Property
				// ===========================
				if (resource === 'property') {
					const model = this.getNodeParameter('model', i) as string;
					const recordId = this.getNodeParameter('recordId', i) as number;
					const propertiesField = this.getNodeParameter(
						'propertiesField',
						i,
					) as string;

					if (operation === 'get') {
						const records = await client.read(
							model,
							recordId,
							[propertiesField],
						);
						const record = records[0];
						responseData = record
							? { id: recordId, [propertiesField]: record[propertiesField] }
							: {};
					}

					if (operation === 'update') {
						const valuesStr = this.getNodeParameter(
							'propertyValues',
							i,
						) as string;
						let values: Record<string, any>;
						try {
							values = JSON.parse(valuesStr);
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Property values must be valid JSON',
								{ itemIndex: i },
							);
						}

						await client.properties.updateSafely(
							model,
							recordId,
							propertiesField,
							values,
						);
						responseData = { id: recordId, success: true, updated: Object.keys(values) };
					}
				}

				// ===========================
				// Schema
				// ===========================
				if (resource === 'schema') {
					const introspector = getIntrospector(client);

					if (operation === 'listModels') {
						const includeTransient = this.getNodeParameter(
							'includeTransient',
							i,
							false,
						) as boolean;
						const models = await introspector.getModels({
							includeTransient,
						});
						responseData = models;
					}

					if (operation === 'getFields') {
						const model = this.getNodeParameter('model', i) as string;
						const fields = await introspector.getFields(model);
						responseData = fields;
					}
				}

				// ===========================
				// Return data
				// ===========================
				if (responseData !== undefined) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({
							error: (error as Error).message,
						}),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ---------- helpers ----------

/**
 * Merge mail.thread context options (checkboxes) into the Odoo context dict.
 * Only includes keys that are explicitly set to `true`.
 */
function mergeMailOptions(
	context: Record<string, any> | undefined,
	mailOptions: Record<string, any>,
): Record<string, any> | undefined {
	const mailKeys = [
		'tracking_disable',
		'mail_notrack',
		'mail_create_nolog',
		'mail_create_nosubscribe',
	];
	const mailContext: Record<string, any> = {};
	for (const key of mailKeys) {
		if (mailOptions[key] === true) {
			mailContext[key] = true;
		}
	}

	if (Object.keys(mailContext).length === 0) {
		return context;
	}

	return { ...(context || {}), ...mailContext };
}

/**
 * Resolve field values from either the UI field picker or raw JSON input.
 * JSON input takes precedence if both are provided.
 */
function resolveValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, any> {
	const valuesJson = ctx.getNodeParameter('valuesJson', itemIndex, '') as string;

	// JSON input takes precedence
	if (valuesJson.trim()) {
		try {
			return JSON.parse(valuesJson);
		} catch {
			throw new NodeOperationError(
				ctx.getNode(),
				'Values JSON must be a valid JSON object',
				{ itemIndex },
			);
		}
	}

	// Fall back to UI field picker
	const fieldsToSet = ctx.getNodeParameter(
		'fieldsToSet',
		itemIndex,
		{},
	) as { fields?: Array<{ fieldName: string; fieldValue: string }> };

	const values: Record<string, any> = {};
	if (fieldsToSet.fields) {
		for (const field of fieldsToSet.fields) {
			let value: any = field.fieldValue;
			// Try to parse JSON values (numbers, booleans, arrays, objects)
			try {
				value = JSON.parse(value);
			} catch {
				// keep as string
			}
			values[field.fieldName] = value;
		}
	}

	return values;
}
