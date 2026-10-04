import type {
	CSSAdoptedStylesheetSource,
	CSSCSSOMSource,
	CSSImportSource,
	CSSInlineSource,
	CSSLinkSource,
	CSSSource,
	CSSStyleSource,
} from './css-source.types.ts'
import type { FrameLike, PageLike, ResponseLike } from './types.ts'

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
	| { type: 'link'; href: string; disabled?: string }
	| { type: 'inline'; css: string }
	| { type: 'adopted'; css: string }
	| { type: 'style'; css: string }
	| { type: 'cssom'; css: string }

/** Walks a frame's document and every nested open shadow root exactly once, in document
 * order, invoking `on_entry` for each `<link rel="stylesheet">` href, each non-empty
 * `<style>` element's text, each non-empty `style` attribute, each distinct adopted
 * `CSSStyleSheet`'s CSS text, and the rules added to each `<style>` sheet after parsing
 * (e.g. via `insertRule`). */
async function walk_css_entries(
	frame: FrameLike,
	on_entry: (entry: CSSWalkEntry) => void,
): Promise<void> {
	const entries = await frame.evaluate(() => {
		const found: CSSWalkEntry[] = []
		const seen_sheets = new Set<CSSStyleSheet>()

		function rules_css(sheet: CSSStyleSheet): string {
			return Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
		}

		function visit(root: Document | ShadowRoot) {
			for (const sheet of root.adoptedStyleSheets) {
				if (seen_sheets.has(sheet)) {
					continue
				}
				seen_sheets.add(sheet)
				found.push({ type: 'adopted', css: rules_css(sheet) })
			}

			for (const sheet of root.styleSheets) {
				if (!(sheet.ownerNode instanceof HTMLStyleElement)) {
					continue
				}
				// Parse the element's text into a reference sheet, and report only the rules
				// that are not in it, i.e. the ones added after parsing. @import rules are
				// skipped: they are reported as import sources, and their serialization
				// changes once fetched, which would otherwise look like an addition.
				const parsed = new CSSStyleSheet()
				parsed.replaceSync(sheet.ownerNode.textContent ?? '')
				const parsed_rules = new Set(Array.from(parsed.cssRules, (rule) => rule.cssText))
				const added_css = Array.from(sheet.cssRules)
					.filter((rule) => !(rule instanceof CSSImportRule) && !parsed_rules.has(rule.cssText))
					.map((rule) => rule.cssText)
				if (added_css.length > 0) {
					found.push({ type: 'cssom', css: added_css.join('\n') })
				}
			}

			for (const el of root.querySelectorAll('*')) {
				if (el.matches('link[rel~="stylesheet" i]')) {
					found.push({
						type: 'link',
						href: (el as HTMLLinkElement).href,
						disabled: el.getAttribute('disabled') ?? undefined,
					})
				} else if (el.matches('style')) {
					const style_contents = el.textContent ?? ''
					if (style_contents.trim().length > 0) {
						found.push({ type: 'style', css: style_contents })
					}
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

	// Cannot call on_entry within page.evaluate(), so call it here afterwards
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

	const link_hrefs = new Map<string, string | undefined>()
	const inline_sources: CSSInlineSource[] = []
	const style_sources: CSSStyleSource[] = []
	const adopted_sources: CSSAdoptedStylesheetSource[] = []
	const cssom_sources: CSSCSSOMSource[] = []

	for (const frame of page.frames()) {
		const frame_url = frame.url()
		const seen_adopted_css = new Set<string>()
		await walk_css_entries(frame, (entry) => {
			if (entry.type === 'link') {
				link_hrefs.set(entry.href, entry.disabled)
			} else if (entry.type === 'inline') {
				inline_sources.push({
					type: 'inline',
					url: frame_url,
					css: entry.css,
				} satisfies CSSInlineSource)
			} else if (entry.type === 'style') {
				style_sources.push({
					type: 'style',
					url: frame_url,
					css: entry.css,
				} satisfies CSSStyleSource)
			} else if (entry.type === 'cssom') {
				cssom_sources.push({
					type: 'cssom',
					url: frame_url,
					css: entry.css,
				} satisfies CSSCSSOMSource)
			} else if (!seen_adopted_css.has(entry.css)) {
				seen_adopted_css.add(entry.css)
				adopted_sources.push({
					type: 'adopted-stylesheet',
					url: frame_url,
					css: entry.css,
				} satisfies CSSAdoptedStylesheetSource)
			}
		})
	}

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

	// Adopted sheets are intentionally not cross-referenced against network-loaded or <style>
	// sources. A constructed CSSStyleSheet has no URL, and its cssText is serialized by the
	// browser (e.g. `#bb5555` becomes `rgb(187, 85, 85)`), so a stylesheet fetched and then
	// adopted into a shadow root appears twice: once as a link/import and once as adopted.
	// Matching on normalized content would fix this, but real-world impact is expected to be low.
	sources.push(...adopted_sources, ...style_sources, ...cssom_sources, ...inline_sources)

	return sources
}
