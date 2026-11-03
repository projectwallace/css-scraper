import type {
	CSSAdoptedStylesheetSource,
	CSSCSSOMSource,
	CSSInlineSource,
	CSSLinkSource,
	CSSSource,
	CSSStyleSource,
} from './css-source.types.ts'
import { read_page_css, type CSSWalkEntry } from './browser.ts'
import type { OnScrapeError, PageLike } from './types.ts'

/** The attributes of a `<link>` that the network response of its stylesheet does not carry. */
export type LinkAttributes = { rel: string; disabled?: string; media?: string }

/** What the DOM walk found: the `<link>`s the network cross-check needs to classify responses,
 * the links that had to be fetched again because no response was recorded, and every other
 * source, already in output order. */
export interface DOMCSS {
	links: Map<string, LinkAttributes>
	import_media: Map<string, string>
	fetched_links: CSSLinkSource[]
	sources: CSSSource[]
}

/** Collects the CSS that lives in the DOM of every frame on the page. A frame that cannot be
 * read (detached or navigated away mid-walk) is reported to `on_error` and skipped, so one bad
 * frame does not lose the CSS of the others. */
export async function collect_dom_css(
	page: PageLike,
	shipped_by_url: Record<string, string>,
	on_error?: OnScrapeError,
): Promise<DOMCSS> {
	const links = new Map<string, LinkAttributes>()
	const import_media = new Map<string, string>()
	const fetched_links: CSSLinkSource[] = []
	const inline_sources: CSSInlineSource[] = []
	const style_sources: CSSStyleSource[] = []
	const adopted_sources: CSSAdoptedStylesheetSource[] = []
	const cssom_sources: CSSCSSOMSource[] = []

	for (const frame of page.frames()) {
		const frame_url = frame.url()
		let entries: CSSWalkEntry[]
		try {
			entries = await frame.evaluate(read_page_css, shipped_by_url)
		} catch (error) {
			on_error?.({ source: 'frame', url: frame_url, error })
			continue
		}

		const seen_adopted_css = new Set<string>()
		for (const entry of entries) {
			if (entry.type === 'link') {
				links.set(entry.href, { rel: entry.rel, disabled: entry.disabled, media: entry.media })
				if (entry.fetched_css !== undefined) {
					fetched_links.push({
						type: 'link',
						href: entry.href,
						url: entry.href,
						rel: entry.rel,
						css: entry.fetched_css,
						disabled: entry.disabled,
						media: entry.media,
					})
				}
			} else if (entry.type === 'import') {
				import_media.set(entry.href, entry.media)
			} else if (entry.type === 'inline') {
				inline_sources.push({ type: 'inline', url: frame_url, css: entry.css })
			} else if (entry.type === 'style') {
				style_sources.push({ type: 'style', url: frame_url, css: entry.css })
			} else if (entry.type === 'cssom') {
				cssom_sources.push({ type: 'cssom', url: frame_url, css: entry.css })
			} else if (!seen_adopted_css.has(entry.css)) {
				seen_adopted_css.add(entry.css)
				adopted_sources.push({ type: 'adopted-stylesheet', url: frame_url, css: entry.css })
			}
		}
	}

	return {
		links,
		import_media,
		fetched_links,
		sources: [...adopted_sources, ...style_sources, ...cssom_sources, ...inline_sources],
	}
}
