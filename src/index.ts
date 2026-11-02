import type { CSSSource } from './css-source.types.ts'
import type { PageLike, ResponseLike } from './types.ts'
import { collect_dom_css } from './dom-css.ts'
import { cross_check_network_responses, track_css_responses } from './network-css.ts'

export type {
	CSSAdoptedStylesheetSource,
	CSSCSSOMSource,
	CSSImportSource,
	CSSInlineSource,
	CSSLinkSource,
	CSSSource,
	CSSStyleSource,
} from './css-source.types.ts'
export type { FrameLike, PageLike, RequestLike, ResponseLike } from './types.ts'
export { track_css_responses } from './network-css.ts'

/** Collects the CSS of a page that has already loaded. Pass the responses recorded by
 * `track_css_responses`, which must have been called before the page started loading. */
export async function collect_css(
	page: PageLike,
	css_responses: ResponseLike[],
): Promise<CSSSource[]> {
	const dom = await collect_dom_css(page)
	const network_sources = await cross_check_network_responses(css_responses, dom.link_hrefs)

	return network_sources.concat(dom.sources)
}

export async function scrape_css(page: PageLike, url: string): Promise<CSSSource[]> {
	const css_responses = track_css_responses(page)

	try {
		await page.goto(url)
	} catch {
		return []
	}

	return collect_css(page, css_responses)
}
