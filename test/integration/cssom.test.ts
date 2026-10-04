import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
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

	test('a rule added via sheet.insertRule() is captured as a "cssom" source, as-authored', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/insert-rule/index.html`)
		expect(css_of(result).join('\n')).toContain('.cssom-insert-rule')
		expect(result[0]).toMatchObject({ type: 'cssom' })
	})

	test('a constructed CSSStyleSheet via replaceSync() is captured as an "adopted-stylesheet" source', async () => {
		const result = await scrape_css(page, `${server.url}/cssom/constructed-stylesheet/index.html`)
		expect(css_of(result).join('\n')).toContain('.cssom-constructed')
		expect(result[0]).toMatchObject({ type: 'adopted-stylesheet' })
	})
})
