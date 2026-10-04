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

describe('CSSOM-added rules', () => {
	test('a rule added via sheet.insertRule() is captured as a "cssom" source, as-authored', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/insert-rule/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'cssom/insert-rule'))
	})

	test('a constructed CSSStyleSheet via replaceSync() is captured as an "adopted-stylesheet" source', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/constructed-stylesheet/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'cssom/constructed-stylesheet'))
	})
})
