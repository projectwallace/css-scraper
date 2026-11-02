import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { collect_css, scrape_css, track_css_responses } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { load_expected_sources } from '../helpers/expected-sources.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

let server: FixtureServer
let page: TestPage

beforeAll(async () => {
	server = await createFixtureServer()
})

afterAll(async () => {
	await server.close()
	await closeBrowser()
})

beforeEach(async () => {
	page = await newPage()
})

afterEach(async () => {
	await page.close()
})

describe('collect_css after the caller navigates', () => {
	test('collects link sources from a page the caller loaded', async () => {
		const css_responses = track_css_responses(page)
		await page.goto(`${server.url}/link/basic/index.html`)
		const result = await collect_css(page, css_responses)
		expect(result).toEqual(load_expected_sources(server, 'link/basic'))
	})

	test('collects nested @import sources from a page the caller loaded', async () => {
		const css_responses = track_css_responses(page)
		await page.goto(`${server.url}/import/nested/index.html`)
		const result = await collect_css(page, css_responses)
		expect(result).toEqual(load_expected_sources(server, 'import/nested'))
	})

	test('gives the same result as scrape_css', async () => {
		const url = `${server.url}/web-components/shadow-link/index.html`
		const scraped = await scrape_css(page, url)

		const other_page = await newPage()
		try {
			const css_responses = track_css_responses(other_page)
			await other_page.goto(url)
			expect(await collect_css(other_page, css_responses)).toEqual(scraped)
		} finally {
			await other_page.close()
		}
	})

	test('misses network stylesheets when tracking starts after navigation', async () => {
		await page.goto(`${server.url}/link/basic/index.html`)
		const css_responses = track_css_responses(page)
		const result = await collect_css(page, css_responses)
		expect(result.filter((source) => source.type === 'link')).toEqual([])
	})
})
