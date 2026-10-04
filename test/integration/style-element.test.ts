import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('<style> elements', () => {
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

	test('a static <style> element is captured as-authored', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/basic/index.html`)
		expect(result.join('\n')).toContain('.style-element-basic')
	})

	test('multiple <style> elements are all captured, in document order', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/multiple/index.html`)
		const combined = result.join('\n')
		expect(combined).toContain('.style-element-first')
		expect(combined).toContain('.style-element-second')
		expect(combined.indexOf('.style-element-first')).toBeLessThan(combined.indexOf('.style-element-second'))
	})

	test('document.createElement("style") content is captured', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/js-created/index.html`)
		expect(result.join('\n')).toContain('.style-element-js-created')
	})

	test('an empty <style> element produces no entry, not a crash', async () => {
		const result = await scrape_css(page, `${server.url}/style-element/failure-empty/index.html`)
		expect(result.join('')).not.toContain('undefined')
	})
})
