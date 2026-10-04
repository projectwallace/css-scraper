import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('CSSOM-added rules', () => {
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

	test('a rule added via sheet.insertRule() is captured as-authored', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/insert-rule/index.html`)
		expect(result.join('\n')).toContain('.cssom-insert-rule')
	})

	test('a constructed CSSStyleSheet via replaceSync() is captured', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/constructed-stylesheet/index.html`)
		expect(result.join('\n')).toContain('.cssom-constructed')
	})
})
