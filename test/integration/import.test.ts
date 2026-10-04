import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('@import', () => {
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

	test('plain @import url() resolves the imported file', async () => {
		const result = await scrape_css(page, `${server.url}/import/plain/index.html`)
		const combined = result.join('\n')
		expect(combined).toContain('.main')
		expect(combined).toContain('.imported')
	})

	test('@import with a prefers-color-scheme condition', async () => {
		await page.emulateMedia({ colorScheme: 'dark' })
		const result = await scrape_css(page, `${server.url}/import/media/index.html`)
		expect(result.join('\n')).toContain('.imported-dark')
	})

	test('@import with a supports() condition', async () => {
		const result = await scrape_css(page, `${server.url}/import/supports/index.html`)
		expect(result.join('\n')).toContain('.imported-grid')
	})

	test('@import with a layer() condition', async () => {
		const result = await scrape_css(page, `${server.url}/import/layer/index.html`)
		expect(result.join('\n')).toContain('.imported-layer')
	})

	test('nested imports three levels deep are all resolved', async () => {
		const result = await scrape_css(page, `${server.url}/import/nested/index.html`)
		const combined = result.join('\n')
		expect(combined).toContain('.chain-a')
		expect(combined).toContain('.chain-b')
		expect(combined).toContain('.chain-c')
	})

	test('an @import of a missing file does not crash the scrape', async () => {
		const result = await scrape_css(page, `${server.url}/import/failure-404-import/index.html`)
		expect(result.join('\n')).toContain('.main')
	})
})
