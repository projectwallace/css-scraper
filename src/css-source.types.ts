type CSSSourceBase = {
	/** The resolved CSS text for this source, as shipped/authored (not browser-normalized). */
	css: string
	/** The absolute URL this source was found on. For network-fetched sources
	 * (`link`, `import`), this is the stylesheet's own URL; for sources that
	 * only exist in the DOM (`style`, `inline`, `cssom`, `adopted-stylesheet`),
	 * this is the URL of the page/document that contains them. */
	url: string
}

export type CSSLinkSource = CSSSourceBase & {
	type: 'link'
	/** The resolved absolute URL of the <link>'s href. */
	href: string
	rel: string
	media?: string
	disabled?: string
}

export type CSSImportSource = CSSSourceBase & {
	type: 'import'
	/** The resolved absolute URL that the @import rule points at. */
	href: string
	media?: string
}

export type CSSStyleSource = CSSSourceBase & {
	type: 'style'
}

export type CSSInlineSource = CSSSourceBase & {
	type: 'inline'
}

/** A constructed CSSStyleSheet adopted via `document.adoptedStyleSheets` or
 * `shadowRoot.adoptedStyleSheets`. */
export type CSSAdoptedStylesheetSource = CSSSourceBase & {
	type: 'adopted-stylesheet'
}

export type CSSSource =
	| CSSLinkSource
	| CSSImportSource
	| CSSStyleSource
	| CSSInlineSource
	| CSSAdoptedStylesheetSource
