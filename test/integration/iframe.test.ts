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

describe('CSS inside <iframe> documents', () => {
	test('a <link rel="stylesheet"> inside an iframe is captured as a "link" source', async () => {
		const result = await scrape_css(page, `${server.url}/iframe/basic-link/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'iframe/basic-link'))
	})

	test('an inline style attribute inside an iframe is attributed to the iframe document', async () => {
		const result = await scrape_css(page, `${server.url}/iframe/inline-style/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'iframe/inline-style'))
	})

	test('an adopted stylesheet inside an iframe is attributed to the iframe document', async () => {
		const result = await scrape_css(page, `${server.url}/iframe/adopted-stylesheet/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'iframe/adopted-stylesheet'))
	})

	test('stylesheets in doubly nested iframes are all captured', async () => {
		const result = await scrape_css(page, `${server.url}/iframe/nested/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'iframe/nested'))
	})
})
