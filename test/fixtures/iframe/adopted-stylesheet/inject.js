const sheet = new CSSStyleSheet()
sheet.replaceSync('.iframe-adopted { color: #227744; }')
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
