import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('inline style="" attributes', () => {
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

	test('a style="" attribute is captured as an "inline" source', async () => {
		const result = await scrape_css(page, `${server.url}/inline-style/basic/index.html`)
		expect(css_of(result).join('\n')).toContain('anchor-name: episode-0')
		expect(result[0]).toMatchObject({ type: 'inline' })
	})

	test('multiple elements each contribute their own declaration', async () => {
		const result = await scrape_css(page, `${server.url}/inline-style/multiple-elements/index.html`)
		const combined = css_of(result).join('\n')
		expect(combined).toContain('#771111')
		expect(combined).toContain('#772222')
	})

	test('an element with no style attribute contributes nothing', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/inline-style/failure-no-style-attr/index.html`,
		)
		expect(result).toEqual([])
	})
})
