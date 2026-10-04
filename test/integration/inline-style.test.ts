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

describe('inline style="" attributes', () => {
	test('a style="" attribute is captured as an "inline" source', async () => {
		const result = await scrape_css(page, `${server.url}/inline-style/basic/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'inline-style/basic'))
	})

	test('a STYLE="" attribute is also captured as an "inline" source', async () => {
		const result = await scrape_css(page, `${server.url}/inline-style/mixed-casing/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'inline-style/mixed-casing'))
	})

	test('multiple elements each contribute their own declaration', async () => {
		const result = await scrape_css(page, `${server.url}/inline-style/multiple-elements/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'inline-style/multiple-elements'))
	})

	test('an element with no style attribute contributes nothing', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/inline-style/failure-no-style-attr/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'inline-style/failure-no-style-attr'))
	})
})
