import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
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

describe('<style> elements', () => {
	test('a static <style> element is captured as a "style" source, as-authored', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/basic/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'style-element/basic'))
	})

	test('multiple <style> elements are all captured, in document order', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/multiple/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'style-element/multiple'))
	})

	test('document.createElement("style") content is captured', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/js-created/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'style-element/js-created'))
	})

	test('an empty <style> element produces no entry, not a crash', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/failure-empty/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'style-element/failure-empty'))
	})
})
