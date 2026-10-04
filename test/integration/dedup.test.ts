import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

describe('deduplication', () => {
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

	// The browser itself coalesces two <link>s with the exact same href into a
	// single network request, so this mostly documents that behavior rather
	// than exercising our own dedup logic. The case that actually exercises
	// our logic — same URL, two responses with *different* bodies, neither
	// discarded — can't be forced through real <link> tags (the browser won't
	// issue a second request for a URL it just fetched), so it's covered at
	// the response-handling level in test/unit/dedup.test.ts instead.
	test('two <link>s to the identical URL produce a single entry', async () => {
		const result = await scrape_css(page, `${server.url}/dedup/same-url-identical/index.html`)
		const matches = result.filter((source) => source.css.includes('.same-url-identical'))
		expect(matches).toHaveLength(1)
	})

	// Three differently-spelled hrefs that all resolve to the exact same
	// resource: a relative path, a host-relative absolute path, and a fully
	// qualified URL with scheme + host. The HTML needs the server's own
	// (ephemeral-port) origin baked in, so this page is registered at
	// request time instead of living as a static fixture file.
	test('relative, root-relative, and fully-qualified hrefs resolving to the same URL count once', async () => {
		const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="/dedup/same-url-relative-absolute/style.css">
<link rel="stylesheet" href="${server.url}/dedup/same-url-relative-absolute/style.css">
</head>
<body>
<p>relative, root-relative, and absolute hrefs for the same resource</p>
</body>
</html>`
		server.registerRoute('/dedup/same-url-relative-absolute/index.html', {
			body: html,
			contentType: 'text/html',
		})

		const result = await scrape_css(
			page,
			`${server.url}/dedup/same-url-relative-absolute/index.html`,
		)
		const matches = result.filter((source) => source.css.includes('.same-url-relative-absolute'))
		expect(matches).toHaveLength(1)
	})
})
