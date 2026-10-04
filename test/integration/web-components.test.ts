import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
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

	test('a shadow root with adoptedStyleSheets is captured as an "adopted-stylesheet" source', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/adopted-stylesheets/index.html`,
		)
		expect(css_of(result).join('\n')).toContain('.my-custom-element')
		expect(result[0]).toMatchObject({ type: 'adopted-stylesheet' })
	})

	test('a shadow root with no adopted stylesheets contributes nothing', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/failure-no-adoption/index.html`,
		)
		expect(result).toEqual([])
	})

	test('a stylesheet already captured via <link> is not duplicated when also adopted into a shadow root', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/shadow-adopted-duplicate/index.html`,
		)
		const matches = result.filter((source) => source.css.includes('.shadow-adopted-duplicate'))
		expect(matches).toHaveLength(1)
		expect(matches[0]).toMatchObject({ type: 'link' })
	})
})

describe('web component <link> stylesheets', () => {
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

	test('a <link rel="stylesheet"> inside a shadow root is captured as a "link" source', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/shadow-link/index.html`)
		expect(css_of(result).join('\n')).toContain('.shadow-link-element')
		expect(result[0]).toMatchObject({ type: 'link' })
	})
})

describe('web component @import', () => {
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

	test('an @import inside a shadow root <style> is resolved and captured as an "import" source', async () => {
		const result = await scrape_css(page, `${server.url}/web-components/shadow-import/index.html`)
		expect(css_of(result).join('\n')).toContain('.shadow-import-element')
		expect(result.some((source) => source.type === 'import')).toBe(true)
	})
})

describe('web component inline style="" attributes', () => {
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

	test('a style="" attribute inside a shadow root is captured as an "inline" source', async () => {
		const result = await scrape_css(
			page,
			`${server.url}/web-components/shadow-inline-style/index.html`,
		)
		expect(css_of(result).join('\n')).toContain('#bb4444')
		expect(result[0]).toMatchObject({ type: 'inline' })
	})
})
