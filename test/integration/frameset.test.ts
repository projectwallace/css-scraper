import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import type { CSSSource } from '../../src/css-source.types.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { load_expected_sources } from '../helpers/expected-sources.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

/** Sibling <frame>s load concurrently, so their CSS responses can arrive in either
 * order; sort by URL before comparing so the assertion doesn't depend on that race. */
function by_url(sources: CSSSource[]): CSSSource[] {
	return [...sources].sort((a, b) => a.url.localeCompare(b.url))
}

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

describe('CSS inside <frameset>/<frame> documents', () => {
	test('each <frame>\'s own stylesheet is captured as a "link" source', async () => {
		const result = await scrape_css(page, `${server.url}/frameset/basic/index.html`)
		expect(by_url(result)).toEqual(by_url(load_expected_sources(server, 'frameset/basic')))
	})
})
