/**
 * Unit tests for GenericFunctions — pure utility functions.
 *
 * Tests buildDomain() and parseContext() which are pure functions
 * (no Odoo/n8n dependencies). getClient/getIntrospector are tested
 * at the integration level.
 */
import { describe, it, expect } from 'vitest';
import { buildDomain, parseContext } from '../../nodes/Odoo/GenericFunctions';

// =============================================================================
// buildDomain
// =============================================================================

describe('buildDomain', () => {
	it('returns empty array when no filters and no JSON', () => {
		expect(buildDomain()).toEqual([]);
		expect(buildDomain(undefined, '')).toEqual([]);
		expect(buildDomain(undefined, '  ')).toEqual([]);
	});

	it('converts UI filter objects to domain tuples', () => {
		const filters = {
			filter: [
				{ fieldName: 'name', operator: 'ilike', value: 'test' },
				{ fieldName: 'active', operator: '=', value: 'true' },
			],
		};
		const domain = buildDomain(filters);
		expect(domain).toEqual([
			['name', 'ilike', 'test'],
			['active', '=', true], // 'true' parsed as JSON boolean
		]);
	});

	it('parses numeric filter values as JSON', () => {
		const filters = {
			filter: [{ fieldName: 'partner_id', operator: '=', value: '42' }],
		};
		expect(buildDomain(filters)).toEqual([['partner_id', '=', 42]]);
	});

	it('parses array filter values as JSON', () => {
		const filters = {
			filter: [{ fieldName: 'id', operator: 'in', value: '[1, 2, 3]' }],
		};
		expect(buildDomain(filters)).toEqual([['id', 'in', [1, 2, 3]]]);
	});

	it('keeps non-parseable values as strings', () => {
		const filters = {
			filter: [{ fieldName: 'name', operator: '=', value: 'hello world' }],
		};
		expect(buildDomain(filters)).toEqual([['name', '=', 'hello world']]);
	});

	it('parses domain JSON string', () => {
		const json = '[["state", "=", "draft"], ["partner_id", "!=", false]]';
		expect(buildDomain(undefined, json)).toEqual([
			['state', '=', 'draft'],
			['partner_id', '!=', false],
		]);
	});

	it('merges UI filters and JSON domain', () => {
		const filters = {
			filter: [{ fieldName: 'name', operator: 'ilike', value: 'test' }],
		};
		const json = '[["active", "=", true]]';
		const domain = buildDomain(filters, json);
		expect(domain).toEqual([
			['name', 'ilike', 'test'],
			['active', '=', true],
		]);
	});

	it('ignores invalid JSON domain gracefully', () => {
		const json = 'not valid json [';
		expect(buildDomain(undefined, json)).toEqual([]);
	});

	it('ignores non-array JSON domain gracefully', () => {
		// If someone passes an object instead of an array
		const json = '{"key": "value"}';
		expect(buildDomain(undefined, json)).toEqual([]);
	});

	it('handles empty filter array', () => {
		expect(buildDomain({ filter: [] })).toEqual([]);
	});

	it('handles undefined filter property', () => {
		expect(buildDomain({} as any)).toEqual([]);
	});

	it('handles Odoo prefix operators in JSON domain', () => {
		const json = '["|", ["state", "=", "draft"], ["state", "=", "sent"]]';
		const domain = buildDomain(undefined, json);
		expect(domain).toEqual([
			'|',
			['state', '=', 'draft'],
			['state', '=', 'sent'],
		]);
	});
});

// =============================================================================
// parseContext
// =============================================================================

describe('parseContext', () => {
	it('returns undefined for empty/undefined input', () => {
		expect(parseContext()).toBeUndefined();
		expect(parseContext('')).toBeUndefined();
		expect(parseContext('  ')).toBeUndefined();
		expect(parseContext(undefined)).toBeUndefined();
	});

	it('parses valid JSON context', () => {
		expect(parseContext('{"lang": "es_ES"}')).toEqual({ lang: 'es_ES' });
	});

	it('parses complex context with nested values', () => {
		const input = '{"lang": "es_ES", "tz": "Europe/Madrid", "active_test": false}';
		expect(parseContext(input)).toEqual({
			lang: 'es_ES',
			tz: 'Europe/Madrid',
			active_test: false,
		});
	});

	it('parses context with mail control variables', () => {
		const input = '{"tracking_disable": true, "mail_create_nolog": true}';
		expect(parseContext(input)).toEqual({
			tracking_disable: true,
			mail_create_nolog: true,
		});
	});

	it('returns undefined for invalid JSON', () => {
		expect(parseContext('not json')).toBeUndefined();
		expect(parseContext('{invalid}')).toBeUndefined();
	});

	it('handles whitespace-padded JSON', () => {
		expect(parseContext('  {"key": "value"}  ')).toEqual({ key: 'value' });
	});
});
