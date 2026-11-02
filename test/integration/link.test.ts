import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import type { CSSSource } from '../../src/index.ts'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { load_expected_sources } from '../helpers/expected-sources.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

let server: FixtureServer
let page: TestPage

// Media-conditioned sheets come back in network arrival order, which is not guaranteed.
const by_css = (a: CSSSource, b: CSSSource) => a.css.localeCompare(b.css)

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

	test('rel="STYLESHEET" (any case) is still classified as a link source, with rel lowercased', async () => {
		const result = await scrape_css(page, `${server.url}/link/mixed-case-rel/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/mixed-case-rel'))
	})

	test('rel="stylesheet alternate" is captured, keeping both keywords in rel', async () => {
		const result = await scrape_css(page, `${server.url}/link/alternate/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/alternate'))
	})

	test('media="(prefers-color-scheme: dark)" is captured regardless of the active scheme', async () => {
		await page.emulateMedia({ colorScheme: 'light' })
		const result = await scrape_css(page, `${server.url}/link/media-dark/index.html`)
		expect(result.sort(by_css)).toEqual(
			load_expected_sources(server, 'link/media-dark').sort(by_css),
		)
	})

	test('media="(prefers-reduced-motion: reduce)" is captured regardless of the active preference', async () => {
		await page.emulateMedia({ reducedMotion: 'reduce' })
		const result = await scrape_css(page, `${server.url}/link/media-reduced-motion/index.html`)
		expect(result.sort(by_css)).toEqual(
			load_expected_sources(server, 'link/media-reduced-motion').sort(by_css),
		)
	})

	test('media="(forced-colors: active)" is captured regardless of the active mode', async () => {
		await page.emulateMedia({ forcedColors: 'active' })
		const result = await scrape_css(page, `${server.url}/link/media-forced-colors/index.html`)
		expect(result.sort(by_css)).toEqual(
			load_expected_sources(server, 'link/media-forced-colors').sort(by_css),
		)
	})

	// A stylesheet that is only preloaded and never applied is not covered here: whether its
	// response is recorded before the load event is up to the browser's timing.
	test('a stylesheet that is both preloaded and linked is captured once, as a link source', async () => {
		const result = await scrape_css(page, `${server.url}/link/preload-and-stylesheet/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/preload-and-stylesheet'))
	})

	test('a <link> inside <noscript> is not captured, as it does not apply with scripting on', async () => {
		const result = await scrape_css(page, `${server.url}/link/noscript/index.html`)
		expect(result).toEqual(load_expected_sources(server, 'link/noscript'))
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
