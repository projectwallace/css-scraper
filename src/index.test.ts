import { type Browser, chromium } from 'playwright'
import { test, expect } from 'vitest'
import { scrape_css } from './index.ts'
import type { PageLike } from './types.ts'

const browser = await chromium.launch()
const page = await browser.newPage()

const css_sources = await scrape_css(page, 'https://projectwallace.com', {
  exclude_unused_css: false,
})
await browser.close()

test.describe('Happy path', () => {
	let browser: Browser
	let page: PageLike

	test.beforeAll(async () => {
		browser = await chromium.launch()
	})

	test.afterAll(async () => {
		await browser.close()
	})

	test.beforeEach(async () => {
		page = await browser.newPage()
	})

	test('first', async () => {
		const result = await scrape_css(page, 'https://www.projectwallace.com')
		console.log(result)
		expect(result).toHaveLength(8)
	})
})

test.describe.skip('Error scenario', () => {

})