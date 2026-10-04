import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { collect_link_hrefs } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
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

describe('collect_link_hrefs', () => {
	test('resolves to the absolute hrefs of the stylesheet links on the page', async () => {
		await page.goto(`${server.url}/link/basic/index.html`)
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set([`${server.url}/link/basic/style.css`]))
	})

	test('resolves to an empty set when the page has no stylesheet links', async () => {
		await page.goto(`${server.url}/style-element/basic/index.html`)
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set())
	})

	test('deduplicates two <link>s with the same href', async () => {
		const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="style.css">
</head>
<body></body>
</html>`
		server.registerRoute('/collect-link-hrefs/duplicate/index.html', { body: html })
		server.registerRoute('/collect-link-hrefs/duplicate/style.css', {
			body: '.a{}',
			contentType: 'text/css',
		})
		await page.goto(`${server.url}/collect-link-hrefs/duplicate/index.html`)
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set([`${server.url}/collect-link-hrefs/duplicate/style.css`]))
	})
})
