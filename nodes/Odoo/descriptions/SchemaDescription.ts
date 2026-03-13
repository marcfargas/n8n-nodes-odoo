/**
 * Schema resource — introspect Odoo models and fields at runtime.
 *
 * Useful for workflows that need to discover model structure dynamically,
 * or for AI agents that need to understand what fields are available
 * before deciding how to operate on a model.
 */
import type { INodeProperties } from 'n8n-workflow';

export const schemaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['schema'],
			},
		},
		options: [
			{
				name: 'List Models',
				value: 'listModels',
				description: 'List all available Odoo models',
				action: 'List models',
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				description: 'Get all fields for a model with type information',
				action: 'Get model fields',
			},
		],
		default: 'listModels',
	},
];

export const schemaDescription: INodeProperties[] = [
	// Model (for getFields)
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
			'The model to introspect. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['schema'],
				operation: ['getFields'],
			},
		},
	},

	// Include transient models
	{
		displayName: 'Include Transient Models',
		name: 'includeTransient',
		type: 'boolean',
		default: false,
		description: 'Whether to include wizard/transient models in the list',
		displayOptions: {
			show: {
				resource: ['schema'],
				operation: ['listModels'],
			},
		},
	},
];
