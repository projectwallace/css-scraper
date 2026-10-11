class MyInlineStyledElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		root.innerHTML = '<p style="color: #bb4444">shadow inline style content</p>'
	}
}

customElements.define('my-inline-styled-element', MyInlineStyledElement)
