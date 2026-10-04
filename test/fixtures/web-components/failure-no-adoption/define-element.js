class MyPlainElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		root.innerHTML = '<p>no stylesheets adopted here</p>'
	}
}

customElements.define('my-plain-element', MyPlainElement)
