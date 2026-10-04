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

describe('link stylesheets', () => {
	test('basic <link rel="stylesheet"> is captured, tagged as a link source', async () => {
		const result = await scrape_css(page, `${server.url}/link/basic/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/basic'))
	})

	test('rel="STYLESHEET" (any case) is still classified as a link source', async () => {
		const result = await scrape_css(page, `${server.url}/link/mixed-case-rel/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/mixed-case-rel'))
	})

	test('rel="stylesheet alternate" is captured', async () => {
		const result = await scrape_css(page, `${server.url}/link/alternate/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/alternate'))
	})

	test('media="(prefers-color-scheme: dark)" only includes the matching scheme', async () => {
		await page.emulateMedia({ colorScheme: 'light' })
		const result = await scrape_css(page, `${server.url}/link/media-dark/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/media-dark'))
	})

	test('media="(prefers-reduced-motion: reduce)" only includes the matching preference', async () => {
		await page.emulateMedia({ reducedMotion: 'reduce' })
		const result = await scrape_css(page, `${server.url}/link/media-reduced-motion/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/media-reduced-motion'))
	})

	test('media="(forced-colors: active)" only includes the matching mode', async () => {
		await page.emulateMedia({ forcedColors: 'active' })
		const result = await scrape_css(page, `${server.url}/link/media-forced-colors/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/media-forced-colors'))
	})

	test('a disabled link is captured, tagged with its disabled attribute', async () => {
		const result = await scrape_css(page, `${server.url}/link/disabled/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/disabled'))
	})

	test('a 404 href produces no entry, not a thrown error', async () => {
		const result = await scrape_css(page, `${server.url}/link/failure-404/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/failure-404'))
	})

	test('a stylesheet served with the wrong content-type is excluded', async () => {
		const css = `.wrong-content-type {\n\tcolor: #333333;\n}\n`
		server.registerRoute('/link/failure-wrong-content-type/style.css', {
			body: css,
			contentType: 'text/plain',
		})
		const result = await scrape_css(
			page,
			`${server.url}/link/failure-wrong-content-type/index.html`,
		)
		expect(result).toEqual(load_expected_sources(server, 'link/failure-wrong-content-type'))
	})
})
