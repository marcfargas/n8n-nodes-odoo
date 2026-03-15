/**
 * URL resource — generate links to Odoo records.
 *
 * Three operations:
 * - Get Base URL: read web.base.url system parameter
 * - Get Record URL: version-agnostic /mail/view redirect link
 * - Get Portal URL: customer-facing portal link with access token
 */
import type { INodeProperties } from 'n8n-workflow';

export const urlOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['url'],
			},
		},
		options: [
			{
				name: 'Get Base URL',
				value: 'getBaseUrl',
				description: 'Get the Odoo instance base URL (web.base.url)',
				action: 'Get base URL',
			},
			{
				name: 'Get Record URL',
				value: 'getRecordUrl',
				description:
					'Get a version-agnostic link to any Odoo record via /mail/view redirect',
				action: 'Get record URL',
			},
			{
				name: 'Get Portal URL',
				value: 'getPortalUrl',
				description:
					'Get a customer-facing portal URL with access token (requires portal.mixin)',
				action: 'Get portal URL',
			},
		],
		default: 'getRecordUrl',
	},
];

export const urlDescription: INodeProperties[] = [
	// ---------- Model (getRecordUrl, getPortalUrl) ----------
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
			'The Odoo model. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['url'],
				operation: ['getRecordUrl', 'getPortalUrl'],
			},
		},
	},

	// ---------- Record ID (getRecordUrl, getPortalUrl) ----------
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the record to generate a URL for',
		displayOptions: {
			show: {
				resource: ['url'],
				operation: ['getRecordUrl', 'getPortalUrl'],
			},
		},
	},

	// ---------- Portal options (getPortalUrl) ----------
	{
		displayName: 'Portal Options',
		name: 'portalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'Additional options for portal URL generation',
		displayOptions: {
			show: {
				resource: ['url'],
				operation: ['getPortalUrl'],
			},
		},
		options: [
			{
				displayName: 'Suffix',
				name: 'suffix',
				type: 'string',
				default: '',
				placeholder: '/accept',
				description:
					'Path suffix to append to the portal URL (e.g., /accept for sale order confirmation)',
			},
			{
				displayName: 'Report Type',
				name: 'reportType',
				type: 'options',
				options: [
					{ name: 'HTML', value: 'html' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'Text', value: 'text' },
				],
				default: 'html',
				description: 'Report format for download links',
			},
			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				default: false,
				description: 'Whether to add the download=true query parameter for direct file downloads',
			},
		],
	},
];
