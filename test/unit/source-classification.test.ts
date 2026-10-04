import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

describe('CSSSource type classification', () => {
	test('a response matching a resolved <link> href is tagged "link"', async () => {
		const href = 'https://example.test/style.css'
		const page = fake_page({
			link_hrefs: [href],
			responses: [
				fake_response({ url: href, headers: { 'content-type': 'text/css' }, text: '.a{}' }),
			],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([{ type: 'link', href, url: href, rel: 'stylesheet', css: '.a{}' }])
	})

	test('a response with no matching <link> href is tagged "import"', async () => {
		const href = 'https://example.test/imported.css'
		const page = fake_page({
			link_hrefs: [],
			responses: [
				fake_response({ url: href, headers: { 'content-type': 'text/css' }, text: '.b{}' }),
			],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([{ type: 'import', href, url: href, css: '.b{}' }])
	})
})
