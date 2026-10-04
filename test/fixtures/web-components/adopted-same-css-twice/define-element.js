const adopted_css = '.adopted { color: #bb1111; }'

function adopt_into_shadow(element) {
	const root = element.attachShadow({ mode: 'open' })
	const sheet = new CSSStyleSheet()
	sheet.replaceSync(adopted_css)
	root.adoptedStyleSheets = [sheet]
}

class FirstAdoptingElement extends HTMLElement {
	connectedCallback() {
		adopt_into_shadow(this)
	}
}

class SecondAdoptingElement extends HTMLElement {
	connectedCallback() {
		adopt_into_shadow(this)
	}
}

customElements.define('first-adopting-element', FirstAdoptingElement)
customElements.define('second-adopting-element', SecondAdoptingElement)
