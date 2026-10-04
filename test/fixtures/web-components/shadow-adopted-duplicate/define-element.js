// Adopts synchronously, like the other fixtures: an awaited fetch could finish after the
// page's `load` event, which is when scrape_css reads the DOM.
const duplicate_css = '.shadow-adopted-duplicate { color: #bb5555; }'

class MyDuplicateAdoptingElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		const sheet = new CSSStyleSheet()
		sheet.replaceSync(duplicate_css)
		root.adoptedStyleSheets = [sheet]
		root.innerHTML += '<p>duplicate-adopted content</p>'
	}
}

customElements.define('my-duplicate-adopting-element', MyDuplicateAdoptingElement)
