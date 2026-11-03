// Functions in this file run inside the browser, via `frame.evaluate()`. Playwright serializes
// them with `toString()`, so each one must be fully self-contained: no imports, no references to
// anything outside its own body. They are excluded from Node coverage (see vitest.config.ts)
// because v8 coverage in the Node process cannot see them; the integration tests exercise them.

/** What `read_page_css` finds in a frame. */
export type CSSWalkEntry =
	| {
			type: 'link'
			href: string
			/** Normalized: lowercased, whitespace collapsed, e.g. `stylesheet alternate`. */
			rel: string
			disabled?: string
			media?: string
			/** The stylesheet text, only for a loaded link that had no recorded network response
			 * (cache hit, service worker, late tracking), obtained by fetching it again. */
			fetched_css?: string
	  }
	| { type: 'import'; href: string; media: string }
	| { type: 'inline'; css: string }
	| { type: 'adopted'; css: string }
	| { type: 'style'; css: string }
	| { type: 'cssom'; css: string }

/** Walks a frame's document and every nested open shadow root exactly once, in document order,
 * and reports each `<link rel="stylesheet">`, each non-empty `<style>` element's text, each
 * non-empty `style` attribute, each distinct adopted `CSSStyleSheet`'s CSS text, and the rules
 * added to each `<style>` or `<link>` sheet after it was parsed (e.g. via `insertRule`).
 *
 * `shipped_by_url` holds the network response bodies recorded for the page. They are the
 * reference a `<link>` sheet's current rules are compared against. */
export async function read_page_css(
	shipped_by_url: Record<string, string>,
): Promise<CSSWalkEntry[]> {
	const found: CSSWalkEntry[] = []
	const seen_sheets = new Set<CSSStyleSheet>()

	// Reports only the rules of `sheet` that are not in `shipped_css`, i.e. the ones added after
	// parsing. @import rules are skipped: they are reported as import sources, and their
	// serialization changes once fetched, which would otherwise look like an addition.
	function added_rules_css(sheet: CSSStyleSheet, shipped_css: string): string | undefined {
		let current_rules: CSSRule[]
		try {
			current_rules = Array.from(sheet.cssRules)
		} catch {
			// Cross-origin sheets without CORS cannot be read
			return undefined
		}
		const parsed = new CSSStyleSheet()
		parsed.replaceSync(shipped_css)
		const parsed_rules = new Set(Array.from(parsed.cssRules, (rule) => rule.cssText))
		const added = current_rules
			.filter((rule) => !(rule instanceof CSSImportRule) && !parsed_rules.has(rule.cssText))
			.map((rule) => rule.cssText)
		return added.length > 0 ? added.join('\n') : undefined
	}

	async function fetch_css(href: string): Promise<string | undefined> {
		try {
			const response = await fetch(href)
			const content_type = response.headers.get('content-type') ?? ''
			return response.ok && content_type.toLowerCase().startsWith('text/css')
				? await response.text()
				: undefined
		} catch {
			return undefined
		}
	}

	// Follows the @import rules of a sheet and the sheets they load. A cross-origin sheet does
	// not expose its rules, so a condition inside one is not found.
	function visit_imports(sheet: CSSStyleSheet) {
		let rules: CSSRuleList
		try {
			rules = sheet.cssRules
		} catch {
			return
		}
		for (const rule of rules) {
			if (!(rule instanceof CSSImportRule)) {
				continue
			}
			const media = rule.media.mediaText
			if (media) {
				const href =
					rule.styleSheet?.href ?? new URL(rule.href, sheet.href ?? document.baseURI).href
				found.push({ type: 'import', href, media })
			}
			if (rule.styleSheet) {
				visit_imports(rule.styleSheet)
			}
		}
	}

	async function visit(root: Document | ShadowRoot) {
		for (const sheet of root.styleSheets) {
			visit_imports(sheet)
		}

		for (const sheet of root.adoptedStyleSheets) {
			if (seen_sheets.has(sheet)) {
				continue
			}
			seen_sheets.add(sheet)
			found.push({
				type: 'adopted',
				css: Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n'),
			})
		}

		for (const sheet of root.styleSheets) {
			if (sheet.ownerNode instanceof HTMLStyleElement) {
				const added_css = added_rules_css(sheet, sheet.ownerNode.textContent ?? '')
				if (added_css !== undefined) {
					found.push({ type: 'cssom', css: added_css })
				}
			}
		}

		for (const el of root.querySelectorAll('*')) {
			if (el.matches('link[rel~="stylesheet" i]')) {
				const link = el as HTMLLinkElement
				const href = link.href
				let shipped_css: string | undefined = shipped_by_url[href]
				let fetched_css: string | undefined
				if (shipped_css === undefined && link.sheet !== null) {
					fetched_css = await fetch_css(href)
					shipped_css = fetched_css
				}
				found.push({
					type: 'link',
					href,
					rel: (link.getAttribute('rel') ?? '')
						.toLowerCase()
						.split(/\s+/)
						.filter(Boolean)
						.join(' '),
					disabled: link.getAttribute('disabled') ?? undefined,
					media: link.getAttribute('media') ?? undefined,
					fetched_css,
				})
				if (shipped_css !== undefined && link.sheet !== null) {
					const added_css = added_rules_css(link.sheet, shipped_css)
					if (added_css !== undefined) {
						found.push({ type: 'cssom', css: added_css })
					}
				}
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
				await visit(el.shadowRoot)
			}
		}
	}

	await visit(document)
	return found
}
