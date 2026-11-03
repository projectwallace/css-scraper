import type { CSSSource } from './css-source.types.ts'
import type { OnScrapeError, PageLike, ResponseLike } from './types.ts'
import { collect_dom_css } from './dom-css.ts'
import {
	cross_check_network_responses,
	read_responses,
	track_css_responses,
} from './network-css.ts'

export type {
	CSSAdoptedStylesheetSource,
	CSSCSSOMSource,
	CSSImportSource,
	CSSInlineSource,
	CSSLinkSource,
	CSSSource,
	CSSStyleSource,
} from './css-source.types.ts'
export type {
	FrameLike,
	OnScrapeError,
	PageLike,
	RequestLike,
	ResponseLike,
	ScrapeError,
} from './types.ts'
export { track_css_responses } from './network-css.ts'

export interface CollectOptions {
	/** Called for every frame or response that could not be read and was skipped. The rest of the
	 * page is still collected. Without it, those failures are silent. */
	on_error?: OnScrapeError
}

export interface ScrapeOptions extends CollectOptions {
	/** Passed to `page.goto()`. */
	waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
	/** Passed to `page.goto()`, in milliseconds. */
	timeout?: number
}

/** Collects the CSS of a page that has already loaded. Pass the responses recorded by
 * `track_css_responses`, which should have been called before the page started loading: a
 * stylesheet that has no recorded response (it came from the cache or a service worker, or
 * tracking started late) is fetched again instead, as long as it is served as `text/css` and
 * readable from the page. */
export async function collect_css(
	page: PageLike,
	css_responses: ResponseLike[],
	options: CollectOptions = {},
): Promise<CSSSource[]> {
	const stylesheets = await read_responses(css_responses, options.on_error)
	const shipped_by_url: Record<string, string> = {}
	for (const { url, css } of stylesheets) {
		shipped_by_url[url] ??= css
	}

	const dom = await collect_dom_css(page, shipped_by_url, options.on_error)
	const network_sources = cross_check_network_responses(stylesheets, dom.links, dom.import_media)

	return [...network_sources, ...dom.fetched_links, ...dom.sources]
}

/** Loads `url` and collects its CSS. Rejects when navigation fails (DNS error, timeout, ...), so a
 * failed scrape can be told apart from a page without CSS. */
export async function scrape_css(
	page: PageLike,
	url: string,
	options: ScrapeOptions = {},
): Promise<CSSSource[]> {
	const css_responses = track_css_responses(page)
	await page.goto(url, { waitUntil: options.waitUntil, timeout: options.timeout })

	return collect_css(page, css_responses, { on_error: options.on_error })
}
