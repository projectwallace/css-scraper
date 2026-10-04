import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { css_of } from '../helpers/css-source.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('content-type filtering', () => {
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

	test('a 404 response is excluded even with a text/css content-type', async () => {
		const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="missing.css">
</head>
<body></body>
</html>`
		server.registerRoute('/content-type-filter/404-with-css-type/index.html', { body: html })
		server.registerRoute('/content-type-filter/404-with-css-type/missing.css', {
			body: '.a{}',
			contentType: 'text/css',
			status: 404,
		})
		const result = await scrape_css(
			page,
			`${server.url}/content-type-filter/404-with-css-type/index.html`,
		)
		expect(result).toEqual([])
	})

	test('text/css with a charset parameter is included, case-insensitively', async () => {
		const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="style.css">
</head>
<body></body>
</html>`
		server.registerRoute('/content-type-filter/charset/index.html', { body: html })
		server.registerRoute('/content-type-filter/charset/style.css', {
			body: '.a{color:red}',
			contentType: 'TEXT/CSS; charset=utf-8',
		})
		const result = await scrape_css(page, `${server.url}/content-type-filter/charset/index.html`)
		expect(css_of(result)).toEqual(['.a{color:red}'])
	})

	test('a mixed batch of ok, 404, and wrong-content-type responses keeps only the valid css', async () => {
		const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="a.css">
<link rel="stylesheet" href="b.json">
<link rel="stylesheet" href="missing.css">
<link rel="stylesheet" href="d.css">
</head>
<body></body>
</html>`
		server.registerRoute('/content-type-filter/mixed-batch/index.html', { body: html })
		server.registerRoute('/content-type-filter/mixed-batch/a.css', {
			body: '.a{}',
			contentType: 'text/css',
		})
		server.registerRoute('/content-type-filter/mixed-batch/b.json', {
			body: '{}',
			contentType: 'application/json',
		})
		server.registerRoute('/content-type-filter/mixed-batch/d.css', {
			body: '.d{}',
			contentType: 'text/css',
		})
		const result = await scrape_css(
			page,
			`${server.url}/content-type-filter/mixed-batch/index.html`,
		)
		expect(css_of(result).sort()).toEqual(['.a{}', '.d{}'])
	})
})
