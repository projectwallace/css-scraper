import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

describe('content-type filtering', () => {
	test('excludes responses that are not ok()', async () => {
		const page = fake_page({
			responses: [fake_response({ status: 404, headers: { 'content-type': 'text/css' }, text: '.a{}' })],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([])
	})

	test('excludes responses with no content-type header', async () => {
		const page = fake_page({
			responses: [fake_response({ headers: {}, text: '.a{}' })],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([])
	})

	test('includes text/css with charset parameter, case-insensitively', async () => {
		const page = fake_page({
			responses: [fake_response({ headers: { 'content-type': 'TEXT/CSS; charset=utf-8' }, text: '.a{color:red}' })],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual(['.a{color:red}'])
	})

	test('excludes non-css content types', async () => {
		const page = fake_page({
			responses: [fake_response({ headers: { 'content-type': 'application/json' }, text: '{}' })],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([])
	})

	test('filters a mixed batch of responses correctly', async () => {
		const page = fake_page({
			responses: [
				fake_response({ url: 'https://example.test/a.css', headers: { 'content-type': 'text/css' }, text: '.a{}' }),
				fake_response({ url: 'https://example.test/b.json', headers: { 'content-type': 'application/json' }, text: '{}' }),
				fake_response({ url: 'https://example.test/c.css', status: 404, headers: { 'content-type': 'text/css' }, text: '.c{}' }),
				fake_response({ url: 'https://example.test/d.css', headers: { 'content-type': 'text/css' }, text: '.d{}' }),
			],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual(['.a{}', '.d{}'])
	})
})
