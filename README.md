# css-scraper

## Installation

```
npm install @projectwallace/css-scraper
```

## Usage

```js
import { chromium } from 'playwright'
import { scrape_css, join } from '@projectwallace/format-css'

const browser = await chromium.launch()
const page = await browser.newPage()

const css_sources = await scrape_css(page, 'https://projectwallace.com', {
  exclude_unused_css: false,
  resolve_source_maps: false,
})
await browser.close()

const css = join(css_sources)
```

## Design pinciples

- Scrape only the CSS applied by the browser, so skip `<link href="dark.css" rel="stylesheet" media="(prefers-color-scheme: dark)">` when the user prefers a light color scheme.
- Similar to linked style sheets via `@import` with import conditions like `@import url(modern.css) supports(display: grid);`
- Aim to get the CSS as it was shipped to the browser, avoid any transformation done by the browser like unminifications (like in `document.stylesheets`) because that messes with color notations for example (browser converts hex to rgb, etc.)

## CSS Sources

We aim to support as many types of CSS sources as possible. Below is a non-exhaustive list of possible sources we aim to find, at any depth or mixed usage. We aim to de-duplicate as much as possible, so that any source that's imported more than once is counted only once.

### Link
- `<link href="style.css" rel="stylesheet">`
- `<link href="style.css" rel="stylesheet alternate">`
- `<link href="dark.css" rel="stylesheet" media="(prefers-color-scheme: dark)">`

### Style element

- `<style>a { color: inherit; }</style>`

### Inline styles

- `<a style="anchor-name: episode-0;">Episode title</a>`

### CSSOM API

- `document.stylesheets`

### CSS imports

- `@import url(style.css)`
- `@import url(style.css) (prefers-color-scheme: dark)`
- `@import url(style.css) supports(display: grid)`
- `@import url(style.css) layer(third-party)`

### Web components

- `MyCustomElement.adoptedStylesheets`
