/**
 * Record resource — universal CRUD on any Odoo model.
 *
 * Replaces the built-in node's Contact/Opportunity/Note/CustomResource
 * with a single, schema-aware resource that works on any model.
 */
import type { INodeProperties } from 'n8n-workflow';

export const recordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record',
				action: 'Delete a record',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a record by ID',
				action: 'Get a record',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for records using domain filters',
				action: 'Search records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing record',
				action: 'Update a record',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Count records matching a domain',
				action: 'Count records',
			},
		],
		default: 'search',
	},
];

export const recordDescription: INodeProperties[] = [
	// ---------- Model (all operations) ----------
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getModels',
		},
		required: true,
		default: '',
		description:
			'The Odoo model to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},

	// ---------- Record ID (get, update, delete) ----------
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the record',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},

	// ---------- Fields to return (get, search) ----------
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getModelFields',
			loadOptionsDependsOn: ['model'],
		},
		default: [],
		description: 'Fields to include in the response. Leave empty to return all fields.',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['get', 'search'],
			},
		},
	},

	// ---------- Domain filter (search, count) ----------
	{
		displayName: 'Domain Filter (JSON)',
		name: 'domainJson',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		placeholder: '[["active", "=", true], ["name", "ilike", "test"]]',
		description:
			'Odoo domain filter as a JSON array. Each condition is [field, operator, value]. Supports &amp; (AND) and | (OR) prefix operators.',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['search', 'count'],
			},
		},
	},

	// ---------- Limit (search) ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['search'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Number of records to skip (for pagination)',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['search'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Order',
		name: 'order',
		type: 'string',
		default: '',
		placeholder: 'name asc, create_date desc',
		description: 'Sort order for results',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['search'],
			},
		},
	},

	// ---------- Field values (create, update) ----------
	{
		displayName: 'Fields to Set',
		name: 'fieldsToSet',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description: 'Field values to set on the record',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getModelFields',
							loadOptionsDependsOn: ['model'],
						},
						default: '',
						description:
							'The field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description:
							'The value to set. For relational fields, use the record ID. For JSON/list values, enter valid JSON.',
					},
				],
			},
		],
	},

	// ---------- Raw JSON values (create, update) — power-user alternative ----------
	{
		displayName: 'Values (JSON)',
		name: 'valuesJson',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		placeholder: '{"name": "New Record", "partner_id": 42}',
		description:
			'Record values as a JSON object. Overrides "Fields to Set" if both are provided. Useful for expressions and dynamic data.',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create', 'update'],
			},
		},
	},

	// ---------- Context (all operations) ----------
	{
		displayName: 'Context (JSON)',
		name: 'context',
		type: 'string',
		default: '',
		placeholder: '{"lang": "es_ES", "active_test": false}',
		description:
			'Odoo context as JSON. Common keys: lang, tz, company_id, active_test, tracking_disable.',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},

	// ---------- Mail context options (create, update) ----------
	{
		displayName: 'Mail Options',
		name: 'mailOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description:
			'Control mail.thread behavior — tracking, notifications, and follower subscriptions. These are merged into the Odoo context alongside any JSON context above.',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Disable All Tracking',
				name: 'tracking_disable',
				type: 'boolean',
				default: false,
				description:
					'Whether to skip ALL mail.thread features — no tracking messages, no notifications, no followers. Best for bulk imports.',
			},
			{
				displayName: 'No Field Change Messages',
				name: 'mail_notrack',
				type: 'boolean',
				default: false,
				description:
					'Whether to skip field change tracking messages but keep other mail.thread features (notifications, followers).',
			},
			{
				displayName: 'No Creation Log (Create Only)',
				name: 'mail_create_nolog',
				type: 'boolean',
				default: false,
				description:
					'Whether to suppress the "Record created" log message in chatter. Only applies to Create operations.',
			},
			{
				displayName: 'No Auto-Subscribe Creator (Create Only)',
				name: 'mail_create_nosubscribe',
				type: 'boolean',
				default: false,
				description:
					'Whether to prevent the creator from being automatically added as a follower. Only applies to Create operations.',
			},
		],
	},
];
