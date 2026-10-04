import type {
	CSSAdoptedStylesheetSource,
	CSSImportSource,
	CSSInlineSource,
	CSSLinkSource,
	CSSSource,
} from './css-source.types.ts'
import type { PageLike, ResponseLike } from './types.ts'

export type { CSSSource } from './css-source.types.ts'

type ScraperOptions = {
	/** Use the coverage API to determine which CSS is used and only return that. Not yet implemented. */
	exclude_unused_css?: boolean
	/** Also resolve and return original sources via CSS source maps, where available. Not yet implemented. */
	resolve_source_maps?: boolean
	/** Whether to also look for <element style="color: red"> and include in the response. Not yet implemented. */
	include_inline_styles?: boolean
}

/** Whether a response is a successful, CSS-typed stylesheet response. */
export function is_css_response(response: ResponseLike): boolean {
	if (!response.ok()) {
		return false
	}
	const content_type = response.headers()['content-type']
	return typeof content_type === 'string' && content_type.toLowerCase().startsWith('text/css')
}

type CSSWalkEntry =
	| { type: 'link'; href: string }
	| { type: 'inline'; css: string }
	| { type: 'adopted'; css: string }

/** Walks the document and every nested open shadow root exactly once, in document order,
 * invoking `on_entry` for each `<link rel="stylesheet">` href, each non-empty `style`
 * attribute, and each distinct adopted `CSSStyleSheet`'s CSS text encountered. */
async function walk_css_entries(
	page: PageLike,
	on_entry: (entry: CSSWalkEntry) => void,
): Promise<void> {
	const entries = await page.evaluate(() => {
		const found: Array<
			| { type: 'link'; href: string }
			| { type: 'inline'; css: string }
			| { type: 'adopted'; css: string }
		> = []
		const seen_sheets = new Set<CSSStyleSheet>()
		function visit(root: Document | ShadowRoot) {
			for (const sheet of root.adoptedStyleSheets) {
				if (seen_sheets.has(sheet)) {
					continue
				}
				seen_sheets.add(sheet)
				const sheet_css = Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
				found.push({ type: 'adopted', css: sheet_css })
			}
			for (const el of root.querySelectorAll('*')) {
				if (el.matches('link[rel~="stylesheet" i]')) {
					found.push({ type: 'link', href: (el as HTMLLinkElement).href })
				}
				const style_attr = el.getAttribute('style')?.trim()
				if (style_attr) {
					found.push({ type: 'inline', css: style_attr })
				}
				if (el.shadowRoot) {
					visit(el.shadowRoot)
				}
			}
		}
		visit(document)
		return found
	})
	for (const entry of entries) {
		on_entry(entry)
	}
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

	const link_hrefs = new Set<string>()
	const inline_sources: CSSInlineSource[] = []
	const adopted_css: string[] = []
	await walk_css_entries(page, (entry) => {
		if (entry.type === 'link') {
			link_hrefs.add(entry.href)
		} else if (entry.type === 'inline') {
			inline_sources.push({ type: 'inline', url, css: entry.css } satisfies CSSInlineSource)
		} else {
			adopted_css.push(entry.css)
		}
	})

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
			sources.push({
				type: 'import',
				href: response_url,
				url: response_url,
				css,
			} satisfies CSSImportSource)
		}
	}

	for (const css of new Set(adopted_css)) {
		sources.push({
			type: 'adopted-stylesheet',
			url,
			css,
		} satisfies CSSAdoptedStylesheetSource)
	}

	sources.push(...inline_sources)

	return sources
}
