export type Ingredient = {
	id: string
	/** Fragment spliced into <head> */
	head?: string
	/** Fragment spliced just before </body> */
	bodyEnd?: string
	/** Extra files this ingredient needs served, keyed by server path */
	files?: Record<string, string>
	/** Substring that must appear in scrape_css()'s output once this source is supported */
	expectedCss: string
	/** Whether src/index.ts currently supports this CSS source type */
	implemented: boolean
}

export const INGREDIENTS: Ingredient[] = [
	{
		id: 'link-basic',
		head: '<link rel="stylesheet" href="/ingredients/link-basic.css">',
		files: {
			'/ingredients/link-basic.css': '.link-basic{color:#111111}',
		},
		expectedCss: '.link-basic{color:#111111}',
		implemented: true,
	},
	{
		id: 'style-element-static',
		head: '<style>.style-element-static{color:#222222}</style>',
		expectedCss: '.style-element-static{color:#222222}',
		implemented: true,
	},
	{
		id: 'style-element-js-created',
		bodyEnd: `<script>
			const el = document.createElement('style')
			el.textContent = '.style-element-js-created{color:#333333}'
			document.head.appendChild(el)
		</script>`,
		expectedCss: '.style-element-js-created{color:#333333}',
		implemented: true,
	},
	{
		id: 'inline-style-attr',
		bodyEnd: '<div style="--ingredient-inline-style-attr: 444444"></div>',
		expectedCss: '--ingredient-inline-style-attr: 444444',
		implemented: true,
	},
	{
		id: 'cssom-insert-rule',
		bodyEnd: `<style id="cssom-insert-rule-sheet"></style>
		<script>
			document.getElementById('cssom-insert-rule-sheet').sheet.insertRule('.cssom-insert-rule{color:#555555}')
		</script>`,
		expectedCss: '.cssom-insert-rule{color:#555555}',
		implemented: false,
	},
	{
		id: 'import-plain',
		head: '<style>@import url("/ingredients/import-plain.css");</style>',
		files: {
			'/ingredients/import-plain.css': '.import-plain{color:#666666}',
		},
		expectedCss: '.import-plain{color:#666666}',
		implemented: true,
	},
	{
		id: 'import-media-match',
		head: '<style>@import url("/ingredients/import-media-match.css") (prefers-color-scheme: light);</style>',
		files: {
			'/ingredients/import-media-match.css': '.import-media-match{color:#777777}',
		},
		expectedCss: '.import-media-match{color:#777777}',
		implemented: true,
	},
	{
		id: 'adopted-stylesheet',
		bodyEnd: `<script>
			class IngredientAdopted extends HTMLElement {
				connectedCallback() {
					const root = this.attachShadow({ mode: 'open' })
					const sheet = new CSSStyleSheet()
					sheet.replaceSync('.adopted-stylesheet{color:#888888}')
					root.adoptedStyleSheets = [sheet]
				}
			}
			customElements.define('ingredient-adopted', IngredientAdopted)
		</script>
		<ingredient-adopted></ingredient-adopted>`,
		expectedCss: '.adopted-stylesheet{color:#888888}',
		implemented: false,
	},
]
