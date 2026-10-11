class MyImportingElement extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow({ mode: 'open' })
		root.innerHTML = `
			<style>@import url('imported.css');</style>
			<p>shadow import content</p>
		`
	}
}

customElements.define('my-importing-element', MyImportingElement)
