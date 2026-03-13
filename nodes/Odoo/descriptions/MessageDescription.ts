/**
 * Message resource — Odoo chatter operations.
 *
 * Post internal notes or public messages on any record that
 * uses the mail.thread mixin. Powered by MailService.
 */
import type { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Post Internal Note',
				value: 'postNote',
				description: 'Post an internal note (visible to internal users only)',
				action: 'Post an internal note',
			},
			{
				name: 'Post Message',
				value: 'postMessage',
				description: 'Post a message (visible to followers including external contacts)',
				action: 'Post a message',
			},
		],
		default: 'postNote',
	},
];

export const messageDescription: INodeProperties[] = [
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
		placeholder: 'res.partner',
		description:
			'The model of the record to post on (must inherit mail.thread). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['message'],
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
		description: 'The ID of the record to post on',
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
	},

	// Body
	{
		displayName: 'Body (HTML)',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		placeholder: '<p>This is a note.</p>',
		description: 'The message body in HTML format',
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
	},
];
