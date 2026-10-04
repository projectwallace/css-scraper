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

describe('web component adoptedStyleSheets', () => {
	test('a shadow root with adoptedStyleSheets is captured as an "adopted-stylesheet" source', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/adopted-stylesheets/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'web-components/adopted-stylesheets'))
	})

	test('a shadow root with no adopted stylesheets contributes nothing', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/failure-no-adoption/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'web-components/failure-no-adoption'))
	})

	test('a stylesheet already captured via <link> is not duplicated when also adopted into a shadow root', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/shadow-adopted-duplicate/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'web-components/shadow-adopted-duplicate'))
	})
})

describe('web component <link> stylesheets', () => {
	test('a <link rel="stylesheet"> inside a shadow root is captured as a "link" source', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/shadow-link/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'web-components/shadow-link'))
	})
})

describe('web component @import', () => {
	test('an @import inside a shadow root <style> is resolved and captured as an "import" source', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/shadow-import/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'web-components/shadow-import'))
	})
})

describe('web component inline style="" attributes', () => {
	test('a style="" attribute inside a shadow root is captured as an "inline" source', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/shadow-inline-style/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'web-components/shadow-inline-style'))
	})
})
