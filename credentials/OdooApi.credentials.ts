import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OdooApi implements ICredentialType {
	name = 'odooApi';
	displayName = 'Odoo API';
	documentationUrl = 'https://github.com/marcfargas/n8n-nodes-odoo';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://mycompany.odoo.com',
			description: 'The URL of your Odoo instance',
			required: true,
		},
		{
			displayName: 'Database',
			name: 'db',
			type: 'string',
			default: '',
			description:
				'The database name. If left empty, it will be inferred from the URL (first subdomain).',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'user@example.com',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The password or API key for the Odoo user',
			required: true,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: '={{$credentials.url.replace(/\\/$/, "")}}/jsonrpc',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'call',
				params: {
					service: 'common',
					method: 'version',
					args: [],
				},
				id: 1,
			}),
		},
	};
}
