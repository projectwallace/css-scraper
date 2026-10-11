import type { CSSImportSource, CSSLinkSource, CSSSource } from './css-source.types.ts'
import type { PageLike, ResponseLike } from './types.ts'

/** Whether a response is a successful, CSS-typed stylesheet response. */
export function is_css_response(response: ResponseLike): boolean {
	if (!response.ok()) {
		return false
	}
	const content_type = response.headers()['content-type']
	return typeof content_type === 'string' && content_type.toLowerCase().startsWith('text/css')
}

/** Starts recording CSS responses as the page loads. The returned array fills up as responses arrive. */
export function track_css_responses(page: PageLike): ResponseLike[] {
	const css_responses: ResponseLike[] = []

	page.on('response', (response) => {
		if (is_css_response(response)) {
			css_responses.push(response)
		}
	})

	return css_responses
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

/** Turns the recorded responses into sources: a response whose URL is a `<link>` in the DOM
 * becomes a link source (carrying its `disabled` state), anything else an import source.
 *
 * Adopted sheets are intentionally not cross-referenced against these. A constructed
 * CSSStyleSheet has no URL, and its cssText is serialized by the browser (e.g. `#bb5555`
 * becomes `rgb(187, 85, 85)`), so a stylesheet fetched and then adopted into a shadow root
 * appears twice: once as a link/import and once as adopted. Matching on normalized content
 * would fix this, but real-world impact is expected to be low. */
export async function cross_check_network_responses(
	css_responses: ResponseLike[],
	link_hrefs: Map<string, string | undefined>,
): Promise<CSSSource[]> {
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
				disabled: link_hrefs.get(response_url),
			} satisfies CSSLinkSource)
		} else {
			sources.push({
				type: 'import',
				href: response_url,
				url: response_url,
				css,
			} satisfies CSSImportSource)
		}
	}

	return sources
}
