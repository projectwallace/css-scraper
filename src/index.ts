import type { CSSSource } from './css-source.types.ts'
import type { PageLike } from './types.ts'
import { collect_dom_css } from './dom-css.ts'
import { cross_check_network_responses, track_css_responses } from './network-css.ts'

export type { CSSSource } from './css-source.types.ts'

export async function scrape_css(page: PageLike, url: string): Promise<CSSSource[]> {
	const css_responses = track_css_responses(page)

	try {
		await page.goto(url)
	} catch {
		return []
	}

	const dom = await collect_dom_css(page)
	const network_sources = await cross_check_network_responses(css_responses, dom.link_hrefs)

	return [...network_sources, ...dom.sources]
}
