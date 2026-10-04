import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('web component adoptedStyleSheets', () => {
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

	test('a shadow root with adoptedStyleSheets is captured', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/adopted-stylesheets/index.html`)
		expect(result.join('\n')).toContain('.my-custom-element')
	})

	test('a shadow root with no adopted stylesheets contributes nothing', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/failure-no-adoption/index.html`)
		expect(result).toEqual([])
	})
})
