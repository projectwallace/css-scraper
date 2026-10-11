class MyCustomElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		const sheet = new CSSStyleSheet()
		sheet.replaceSync('.my-custom-element { color: #bb1111; }')
		root.adoptedStyleSheets = [sheet]
		root.innerHTML = '<p>custom element content</p>'
	}
}

customElements.define('my-custom-element', MyCustomElement)
