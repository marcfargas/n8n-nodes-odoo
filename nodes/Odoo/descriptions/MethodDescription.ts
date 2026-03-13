/**
 * Method resource — call any Odoo model method.
 *
 * This is the power-user escape hatch: action_confirm, action_post,
 * button_validate, or any custom method. The built-in n8n node
 * doesn't support this at all.
 */
import type { INodeProperties } from 'n8n-workflow';

export const methodOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
		options: [
			{
				name: 'Call',
				value: 'call',
				description: 'Call a method on an Odoo model',
				action: 'Call a model method',
			},
		],
		default: 'call',
	},
];

export const methodDescription: INodeProperties[] = [
	// Model
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
			'The Odoo model to call the method on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},

	// Method name
	{
		displayName: 'Method',
		name: 'method',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'action_confirm',
		description:
			'The method name to call (e.g., action_confirm, action_post, button_validate, message_post)',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},

	// Record IDs
	{
		displayName: 'Record IDs',
		name: 'recordIds',
		type: 'string',
		default: '',
		placeholder: '42 or 42,43,44',
		description: 'Comma-separated record IDs to pass as the first positional argument',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},

	// Extra positional args
	{
		displayName: 'Arguments (JSON)',
		name: 'args',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		placeholder: '["arg1", 42]',
		description:
			'Additional positional arguments as a JSON array. These are appended after the record IDs.',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},

	// Keyword args
	{
		displayName: 'Keyword Arguments (JSON)',
		name: 'kwargs',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		placeholder: '{"force": true}',
		description: 'Keyword arguments as a JSON object',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},

	// Context
	{
		displayName: 'Context (JSON)',
		name: 'context',
		type: 'string',
		default: '',
		placeholder: '{"lang": "es_ES"}',
		description: 'Odoo context as JSON',
		displayOptions: {
			show: {
				resource: ['method'],
			},
		},
	},
];
