import type { CSSImportSource, CSSLinkSource } from './css-source.types.ts'
import type { LinkAttributes } from './dom-css.ts'
import type { OnScrapeError, PageLike, ResponseLike } from './types.ts'

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

/** A recorded stylesheet response with its body read. */
export interface FetchedStylesheet {
	url: string
	css: string
}

/** Reads the bodies of the recorded responses, collapsing identical repeats. A body that can no
 * longer be read (e.g. the page navigated away and the browser dropped it) is reported to
 * `on_error` and skipped. */
export async function read_responses(
	css_responses: ResponseLike[],
	on_error?: OnScrapeError,
): Promise<FetchedStylesheet[]> {
	const deduplicator = create_deduplicator()
	const stylesheets: FetchedStylesheet[] = []

	for (const response of css_responses) {
		const url = response.url()
		let css: string
		try {
			css = await response.text()
		} catch (error) {
			on_error?.({ source: 'response', url, error })
			continue
		}

		if (!deduplicator.is_duplicate(url, css)) {
			stylesheets.push({ url, css })
		}
	}

	return stylesheets
}

/** Turns the read responses into sources: a response whose URL is a `<link>` in the DOM
 * becomes a link source (carrying its `rel`, `disabled` state and `media`), anything else an
 * import source (carrying the `media` of its `@import` rule).
 *
 * Adopted sheets are intentionally not cross-referenced against these. A constructed
 * CSSStyleSheet has no URL, and its cssText is serialized by the browser (e.g. `#bb5555`
 * becomes `rgb(187, 85, 85)`), so a stylesheet fetched and then adopted into a shadow root
 * appears twice: once as a link/import and once as adopted. Matching on normalized content
 * would fix this, but real-world impact is expected to be low. */
export function cross_check_network_responses(
	stylesheets: FetchedStylesheet[],
	links: Map<string, LinkAttributes>,
	import_media: Map<string, string>,
): Array<CSSLinkSource | CSSImportSource> {
	return stylesheets.map(({ url, css }) => {
		const link = links.get(url)
		if (link) {
			return {
				type: 'link',
				href: url,
				url,
				rel: link.rel,
				css,
				disabled: link.disabled,
				media: link.media,
			} satisfies CSSLinkSource
		}
		return {
			type: 'import',
			href: url,
			url,
			css,
			media: import_media.get(url),
		} satisfies CSSImportSource
	})
}
