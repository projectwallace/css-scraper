import type { CSSLinkSource, CSSSource } from './css-source.types.ts'
import type { PageLike, ResponseLike } from './types.ts'

export type { CSSSource } from './css-source.types.ts'

type ScraperOptions = {
	/** Use the coverage API to determine which CSS is used and only return that. Not yet implemented. */
	exclude_unused_css?: boolean
	/** Also resolve and return original sources via CSS source maps, where available. Not yet implemented. */
	resolve_source_maps?: boolean
}

export async function scrape_css(
	page: PageLike,
	url: string,
	options: ScraperOptions = {},
): Promise<CSSSource[]> {
	const css_responses: ResponseLike[] = []

	page.on('response', (response) => {
		if (response.ok()) {
			const headers = response.headers()
			const content_type = headers['content-type']
			if (typeof content_type === 'string' && content_type.toLowerCase().startsWith('text/css')) {
				css_responses.push(response)
			}
		}
	})

	try {
		await page.goto(url)
	} catch {
		return []
	}

	const link_hrefs = new Set<string>(
		await page.evaluate(() =>
			Array.from(document.querySelectorAll('link[rel~="stylesheet" i]')).map(
				(link) => (link as HTMLLinkElement).href,
			),
		),
	)

	const sources: CSSSource[] = []
	const seen_per_url = new Map<string, Set<string>>()

	for (const response of css_responses) {
		let css: string
		try {
			css = await response.text()
		} catch {
			continue
		}
		const response_url = response.url()

		const seen = seen_per_url.get(response_url)
		if (seen?.has(css)) {
			continue
		}
		if (seen) {
			seen.add(css)
		} else {
			seen_per_url.set(response_url, new Set([css]))
		}

		if (link_hrefs.has(response_url)) {
			const link_source: CSSLinkSource = {
				type: 'link',
				href: response_url,
				url: response_url,
				rel: 'stylesheet',
				css,
			}
			sources.push(link_source)
		} else {
			sources.push({ type: 'import', href: response_url, url: response_url, css })
		}
	}

	return sources
}
