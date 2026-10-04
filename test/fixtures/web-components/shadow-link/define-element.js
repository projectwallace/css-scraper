class MyLinkedElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		root.innerHTML = `
			<link rel="stylesheet" href="style.css" />
			<p>shadow link content</p>
		`
	}
}

customElements.define('my-linked-element', MyLinkedElement)
