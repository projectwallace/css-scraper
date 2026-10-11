import { chromium, type Browser } from 'playwright'
import type { PageLike } from '../../src/types.ts'

/** PageLike plus the couple of real Playwright methods the test suite calls directly. */
export type TestPage = PageLike & {
	emulateMedia(options: {
		colorScheme?: 'light' | 'dark' | 'no-preference'
		reducedMotion?: 'reduce' | 'no-preference'
		forcedColors?: 'active' | 'none'
	}): Promise<void>
	close(): Promise<void>
}

let browser: Browser | undefined

async function getBrowser(): Promise<Browser> {
	if (!browser) {
		// Use the CI runner's system Chrome instead of Playwright's bundled
		// Chromium, so no separate `playwright install` step is needed.
		browser = await chromium.launch(process.env.CI ? { channel: 'chrome' } : {})
	}
	return browser
}

export async function newPage(): Promise<TestPage> {
	const b = await getBrowser()
	const page = await b.newPage()
	// Playwright's Page is structurally richer than PageLike (and its heavily
	// overloaded `.on()`/`.off()` don't satisfy PageLike's narrower signatures
	// under strict mode), but it satisfies PageLike at runtime, which is all
	// scrape_css relies on.
	return page as unknown as TestPage
}

export async function closeBrowser(): Promise<void> {
	if (browser) {
		await browser.close()
		browser = undefined
	}
}
