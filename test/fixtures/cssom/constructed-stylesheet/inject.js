const sheet = new CSSStyleSheet()
sheet.replaceSync('.cssom-constructed { color: #882222; }')
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
