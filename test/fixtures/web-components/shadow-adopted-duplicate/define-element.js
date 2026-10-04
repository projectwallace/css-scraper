class MyDuplicateAdoptingElement extends HTMLElement {
	async connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		const css = await fetch('style.css').then((response) => response.text())
		const sheet = new CSSStyleSheet()
		sheet.replaceSync(css)
		root.adoptedStyleSheets = [sheet]
		root.innerHTML += '<p>duplicate-adopted content</p>'
	}
}

customElements.define('my-duplicate-adopting-element', MyDuplicateAdoptingElement)
