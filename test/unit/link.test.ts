import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

// Whether a disabled stylesheet is fetched is up to the browser (Chromium 153 does,
// Chromium 156 does not), so fake both behaviours instead of depending on the installed one.
describe('link stylesheets', () => {
	test('a fetched disabled link is tagged with its disabled attribute', async () => {
		const href = 'https://example.test/style.css'
		const page = fake_page({
			dom_entries: [{ type: 'link', href, disabled: '' }],
			responses: [
				fake_response({ url: href, headers: { 'content-type': 'text/css' }, text: '.a {}' }),
			],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([
			{ type: 'link', href, url: href, rel: 'stylesheet', css: '.a {}', disabled: '' },
		])
	})

	test('an unfetched disabled link produces no entry', async () => {
		const href = 'https://example.test/style.css'
		const page = fake_page({ dom_entries: [{ type: 'link', href, disabled: '' }] })
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([])
	})
})
