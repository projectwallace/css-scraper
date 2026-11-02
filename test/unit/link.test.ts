import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

const href = 'https://example.test/style.css'
const css_response = (css = '.a {}') =>
	fake_response({ url: href, headers: { 'content-type': 'text/css' }, text: css })

// Whether a disabled stylesheet is fetched is up to the browser (Chromium 153 does,
// Chromium 156 does not), so fake both behaviours instead of depending on the installed one.
describe('link stylesheets', () => {
	test('a fetched disabled link is tagged with its disabled attribute', async () => {
		const page = fake_page({
			dom_entries: [{ type: 'link', href, rel: 'stylesheet', disabled: '' }],
			responses: [css_response()],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([
			{ type: 'link', href, url: href, rel: 'stylesheet', css: '.a {}', disabled: '' },
		])
	})

	test('an unfetched disabled link produces no entry', async () => {
		const page = fake_page({
			dom_entries: [{ type: 'link', href, rel: 'stylesheet', disabled: '' }],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([])
	})

	test('the link keeps all of its rel keywords', async () => {
		const page = fake_page({
			dom_entries: [{ type: 'link', href, rel: 'stylesheet alternate' }],
			responses: [css_response()],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toMatchObject([{ type: 'link', rel: 'stylesheet alternate' }])
	})
})

describe('link stylesheets without a recorded response', () => {
	test('a loaded link whose body the page could fetch again is a link source', async () => {
		const page = fake_page({
			dom_entries: [{ type: 'link', href, rel: 'stylesheet', fetched_css: '.cached {}' }],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([
			{ type: 'link', href, url: href, rel: 'stylesheet', css: '.cached {}' },
		])
	})

	test('a link with a recorded response is not repeated by its fetched copy', async () => {
		const page = fake_page({
			dom_entries: [{ type: 'link', href, rel: 'stylesheet' }],
			responses: [css_response('.recorded {}')],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result).toEqual([
			{ type: 'link', href, url: href, rel: 'stylesheet', css: '.recorded {}' },
		])
	})
})
