/**
 * Odoo Toolbox Trigger — polling trigger for Odoo record changes.
 *
 * Polls a model for records modified since the last check using
 * write_date. Supports domain filters and field selection.
 *
 * TODO: Phase 3 — full implementation
 */
import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { getClient, buildDomain, parseContext } from './GenericFunctions';

export class OdooTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo Toolbox Trigger',
		name: 'odooToolboxTrigger',
		icon: 'file:odoo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["model"]}}',
		description: 'Triggers when records are created or modified in Odoo',
		defaults: {
			name: 'Odoo Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'odooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'res.partner',
				description: 'The Odoo model to watch for changes',
			},
			{
				displayName: 'Domain Filter (JSON)',
				name: 'domainJson',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: '[["active", "=", true]]',
				description: 'Optional domain filter to narrow which records to watch',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				placeholder: 'name,email,partner_id',
				description:
					'Comma-separated list of fields to include. Leave empty for all.',
			},
			{
				displayName: 'Context (JSON)',
				name: 'context',
				type: 'string',
				default: '',
				placeholder: '{"active_test": false}',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const model = this.getNodeParameter('model') as string;
		const domainJson = this.getNodeParameter('domainJson', '') as string;
		const fieldsStr = this.getNodeParameter('fields', '') as string;
		const contextStr = this.getNodeParameter('context', '') as string;

		const client = await getClient(this);

		// Get the last poll time from workflow static data
		const staticData = this.getWorkflowStaticData('node');
		const lastPoll = staticData.lastPoll as string | undefined;

		// Build domain: user domain + write_date filter
		const userDomain = buildDomain(undefined, domainJson);
		const domain = [...userDomain];
		if (lastPoll) {
			domain.push(['write_date', '>', lastPoll]);
		}

		// Parse fields
		const fields = fieldsStr
			? fieldsStr.split(',').map((f) => f.trim()).filter(Boolean)
			: undefined;

		// context is parsed but not passed to searchRead in the current
		// odoo-client version — will be supported in a future release
		const _context = parseContext(contextStr);

		const records = await client.searchRead(model, domain, {
			fields: fields?.length ? [...fields, 'write_date'] : undefined,
			order: 'write_date asc',
		});

		// Update last poll timestamp
		if (records.length > 0) {
			const lastRecord = records[records.length - 1] as any;
			staticData.lastPoll = lastRecord.write_date;
		} else if (!lastPoll) {
			// First poll — set to now so we don't get everything on next poll
			staticData.lastPoll = new Date().toISOString().replace('T', ' ').slice(0, 19);
		}

		if (records.length === 0) return null;

		return [this.helpers.returnJsonArray(records)];
	}
}
