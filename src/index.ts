import type { CSSImportSource, CSSLinkSource, CSSSource } from './css-source.types.ts'
import type { PageLike, ResponseLike } from './types.ts'

export type { CSSSource } from './css-source.types.ts'

type ScraperOptions = {
	/** Use the coverage API to determine which CSS is used and only return that. Not yet implemented. */
	exclude_unused_css?: boolean
	/** Also resolve and return original sources via CSS source maps, where available. Not yet implemented. */
	resolve_source_maps?: boolean
}

/** Whether a response is a successful, CSS-typed stylesheet response. */
export function is_css_response(response: ResponseLike): boolean {
	if (!response.ok()) {
		return false
	}
	const content_type = response.headers()['content-type']
	return typeof content_type === 'string' && content_type.toLowerCase().startsWith('text/css')
}

/** Resolves the absolute hrefs of all `<link rel="stylesheet">` elements currently in the document. */
export async function collect_link_hrefs(page: PageLike): Promise<Set<string>> {
	const hrefs = await page.evaluate(() =>
		Array.from(document.querySelectorAll('link[rel~="stylesheet" i]')).map(
			(link) => (link as HTMLLinkElement).href,
		),
	)
	return new Set(hrefs)
}

/** Tracks which (url, css) pairs have already been seen, to collapse identical repeat responses. */
export function create_deduplicator() {
	const seen_per_url = new Map<string, Set<string>>()

	return {
		/** Records the pair and reports whether it was already seen before this call. */
		is_duplicate(url: string, css: string): boolean {
			const seen = seen_per_url.get(url)
			if (seen?.has(css)) {
				return true
			}
			if (seen) {
				seen.add(css)
			} else {
				seen_per_url.set(url, new Set([css]))
			}
			return false
		},
	}
}

export async function scrape_css(
	page: PageLike,
	url: string,
	options: ScraperOptions = {},
): Promise<CSSSource[]> {
	const css_responses: ResponseLike[] = []

	page.on('response', (response) => {
		if (is_css_response(response)) {
			css_responses.push(response)
		}
	})

	try {
		await page.goto(url)
	} catch {
		return []
	}

	const link_hrefs = await collect_link_hrefs(page)
	const deduplicator = create_deduplicator()
	const sources: CSSSource[] = []

	for (const response of css_responses) {
		let css: string
		try {
			css = await response.text()
		} catch {
			continue
		}
		const response_url = response.url()

		if (deduplicator.is_duplicate(response_url, css)) {
			continue
		}

		if (link_hrefs.has(response_url)) {
			sources.push({
				type: 'link',
				href: response_url,
				url: response_url,
				rel: 'stylesheet',
				css,
			} satisfies CSSLinkSource)
		} else {
			sources.push({ type: 'import', href: response_url, url: response_url, css } satisfies CSSImportSource)
		}
	}

	return sources
}
