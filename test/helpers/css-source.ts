import type { CSSSource } from '../../src/css-source.types.ts'

/** Pulls just the `css` text out of each source, in order, for easy assertions. */
export function css_of(sources: CSSSource[]): string[] {
	return sources.map((source) => source.css)
}
