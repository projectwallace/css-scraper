import type {
	CSSAdoptedStylesheetSource,
	CSSCSSOMSource,
	CSSInlineSource,
	CSSSource,
	CSSStyleSource,
} from './css-source.types.ts'
import type { PageLike, FrameLike } from './types.ts'

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
	/* v8 ignore start -- runs inside the browser via Playwright, not in the Node coverage process */
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
	/* v8 ignore stop */

	// Cannot call on_entry within page.evaluate(), so call it here afterwards
	for (const entry of entries) {
		on_entry(entry)
	}
}

/** What the DOM walk found: the `<link>` hrefs for the network cross-check, and every
 * other source, already in output order. */
export interface DOMCSS {
	link_hrefs: Map<string, string | undefined>
	sources: CSSSource[]
}

/** Collects the CSS that lives in the DOM of every frame on the page. */
export async function collect_dom_css(page: PageLike): Promise<DOMCSS> {
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

	return {
		link_hrefs,
		sources: [...adopted_sources, ...style_sources, ...cssom_sources, ...inline_sources],
	}
}
