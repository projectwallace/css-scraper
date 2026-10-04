import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
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

describe('resolve_source_maps option', () => {
	test('defaults to off: shipped CSS only, no map fetched', async () => {
		const result = await scrape_css(page, `${server.url}/source-maps/basic/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'source-maps/basic'))
	})

	// resolve_source_maps is not implemented yet (see ScraperOptions), and the
	// shape its resolved sources will take isn't decided — CSSSource has no
	// variant for them yet — so this one stays a loose substring check instead
	// of an expected.json fixture.
	test('resolves sourcesContent alongside the shipped CSS when enabled', async () => {
		const result = await scrape_css(page, `${server.url}/source-maps/basic/index.html`, {
			resolve_source_maps: true,
		})
		const combined = css_of(result).join('\n')
		expect(combined).toContain('.shipped')
		expect(combined).toContain('.original-source')
	})

	test('a 404 sourceMappingURL falls back to shipped CSS without throwing', async () => {
		const result = await scrape_css(page, `${server.url}/source-maps/failure-map-404/index.html`, {
			resolve_source_maps: true,
		})
		expect(result).toEqual(load_expected_sources(server, 'source-maps/failure-map-404'))
	})

	test('a map with no sourcesContent falls back to shipped CSS without throwing', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/source-maps/failure-no-sources-content/index.html`,
			{
				resolve_source_maps: true,
			},
		)
		expect(result).toEqual(load_expected_sources(server, 'source-maps/failure-no-sources-content'))
	})
})
