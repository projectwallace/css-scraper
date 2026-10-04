import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('link stylesheets', () => {
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

	test('basic <link rel="stylesheet"> is captured, tagged as a link source', async () => {
		const result = await scrape_css(page, `${server.url}/link/basic/index.html`)
		expect(css_of(result)).toEqual(['.basic-link {\n\tcolor: #abc123;\n}\n'])
		expect(result[0]).toMatchObject({ type: 'link', rel: 'stylesheet' })
	})

	test('rel="STYLESHEET" (any case) is still classified as a link source', async () => {
		const result = await scrape_css(page, `${server.url}/link/mixed-case-rel/index.html`)
		expect(css_of(result)).toEqual(['.mixed-case-rel {\n\tcolor: #ee8888;\n}\n'])
		expect(result[0]).toMatchObject({ type: 'link' })
	})

	test('rel="stylesheet alternate" is captured', async () => {
		const result = await scrape_css(page, `${server.url}/link/alternate/index.html`)
		expect(css_of(result)).toEqual(['.alternate-link {\n\tcolor: #abc234;\n}\n'])
	})

	test('media="(prefers-color-scheme: dark)" only includes the matching scheme', async () => {
		await page.emulateMedia({ colorScheme: 'light' })
		const result = await scrape_css(page, `${server.url}/link/media-dark/index.html`)
		expect(css_of(result).join('\n')).toContain('.scheme-light')
		expect(css_of(result).join('\n')).not.toContain('.scheme-dark')
	})

	test('media="(prefers-reduced-motion: reduce)" only includes the matching preference', async () => {
		await page.emulateMedia({ reducedMotion: 'reduce' })
		const result = await scrape_css(page, `${server.url}/link/media-reduced-motion/index.html`)
		expect(css_of(result).join('\n')).toContain('.motion-reduced')
		expect(css_of(result).join('\n')).not.toContain('.motion-ok')
	})

	test('media="(forced-colors: active)" only includes the matching mode', async () => {
		await page.emulateMedia({ forcedColors: 'active' })
		const result = await scrape_css(page, `${server.url}/link/media-forced-colors/index.html`)
		expect(css_of(result).join('\n')).toContain('.colors-forced')
		expect(css_of(result).join('\n')).not.toContain('.colors-normal')
	})

	test('a disabled link is not fetched at all', async () => {
		const result = await scrape_css(page, `${server.url}/link/disabled/index.html`)
		expect(result).toEqual([])
	})

	test('a 404 href produces no entry, not a thrown error', async () => {
		const result = await scrape_css(page, `${server.url}/link/failure-404/index.html`)
		expect(result).toEqual([])
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
		expect(result).toEqual([])
	})
})
