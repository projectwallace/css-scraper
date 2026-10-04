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

describe('@import', () => {
	test('plain @import url() resolves the imported file, tagged as an import source', async () => {
		const result = await scrape_css(page, `${server.url}/import/plain/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/plain'))
	})

	test('@import with a prefers-color-scheme condition', async () => {
		await page.emulateMedia({ colorScheme: 'dark' })
		const result = await scrape_css(page, `${server.url}/import/media/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/media'))
	})

	test('@import with a supports() condition', async () => {
		const result = await scrape_css(page, `${server.url}/import/supports/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/supports'))
	})

	test('@import with a layer() condition', async () => {
		const result = await scrape_css(page, `${server.url}/import/layer/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/layer'))
	})

	test('nested imports three levels deep are all resolved', async () => {
		const result = await scrape_css(page, `${server.url}/import/nested/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/nested'))
	})

	test('an @import of a missing file does not crash the scrape', async () => {
		const result = await scrape_css(page, `${server.url}/import/failure-404-import/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'import/failure-404-import'))
	})
})
