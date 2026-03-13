/**
 * Property resource — read/write Odoo dynamic property fields.
 *
 * Odoo 17+ properties (ir.model.fields with type 'properties') are
 * stored as JSON blobs with special write semantics. The PropertiesService
 * handles safe reading and writing of individual property values without
 * clobbering other properties on the same record.
 *
 * @see skills/odoo/base/properties.md for the full complexity
 */
import type { INodeProperties } from 'n8n-workflow';

export const propertyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Read property values from a record',
				action: 'Get property values',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Safely update one or more property values on a record (read-modify-write pattern)',
				action: 'Update property values',
			},
		],
		default: 'get',
	},
];

export const propertyDescription: INodeProperties[] = [
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
			'The model that has properties fields. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
	},

	// Record ID
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the record',
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
	},

	// Properties field name
	{
		displayName: 'Properties Field',
		name: 'propertiesField',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'partner_properties',
		description:
			'The technical name of the properties field on the model (type "properties" in Odoo schema)',
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
	},

	// Property values to update (JSON)
	{
		displayName: 'Values (JSON)',
		name: 'propertyValues',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		placeholder: '{"property_name_1": "new value", "property_name_2": 42}',
		description:
			'Property values to update as a JSON object. Only the specified properties will be changed — other properties on the record are preserved (safe read-modify-write).',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['update'],
			},
		},
	},
];
