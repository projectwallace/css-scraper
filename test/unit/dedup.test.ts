import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

describe('content-aware deduplication', () => {
	test('same URL, identical content across two responses collapses to one entry', async () => {
		const url = 'https://example.test/style.css'
		const page = fake_page({
			responses: [
				fake_response({ url, headers: { 'content-type': 'text/css' }, text: '.a { color: red; }' }),
				fake_response({ url, headers: { 'content-type': 'text/css' }, text: '.a { color: red; }' }),
			],
		})
		const result = await scrape_css(page, url)
		expect(result).toEqual(['.a { color: red; }'])
	})

	test('same URL, different content across two responses keeps both unique bodies', async () => {
		const url = 'https://example.test/style.css'
		const page = fake_page({
			responses: [
				fake_response({ url, headers: { 'content-type': 'text/css' }, text: '.a { color: red; }' }),
				fake_response({ url, headers: { 'content-type': 'text/css' }, text: '.b { color: blue; }' }),
			],
		})
		const result = await scrape_css(page, url)
		expect(result).toContain('.a { color: red; }')
		expect(result).toContain('.b { color: blue; }')
	})
})
