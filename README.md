# css-scraper

## Installation

```
npm install @projectwallace/css-scraper
```

## Usage

```js
import { chromium } from 'playwright'
import { scrape_css, join } from '@projectwallace/scrape-css'

const browser = await chromium.launch()
const page = await browser.newPage()

const css_sources = await scrape_css(page, 'https://projectwallace.com')
await browser.close()

const css = css_sources.join((css_source) => css.source.css).join('\n')
```

## Design principles

- Scrape every stylesheet the page declares, regardless of whether its conditions currently apply. A `<link href="dark.css" rel="stylesheet" media="(prefers-color-scheme: dark)">` is scraped even when the user prefers a light color scheme, because the browser downloads it anyway and the page's full CSS is what we want.
- Treat `@import` the same as linked style sheets, including import conditions like `@import url(modern.css) supports(display: grid);`. Every import is scraped regardless of its conditions.
- Get the CSS as close as possible to how it was shipped, bundled or authored. Prefer the network response body and `<style>` text over anything read back from the browser. Avoid transformations done by the browser, like unminification or color normalization (browser converts hex to rgb, etc.), which is why `document.stylesheets` is not used as a source. Where no shipped text exists (rules added with `insertRule()`, constructed stylesheets adopted into a document or shadow root), the browser-serialized CSS is the only option and is marked as such in the source `type`.

## CSS Sources

We aim to support as many types of CSS sources as possible. Below is a non-exhaustive list of possible sources we aim to find, at any depth or mixed usage. We aim to de-duplicate as much as possible, so that any source that's imported more than once is counted only once.

### Link

- `<link href="style.css" rel="stylesheet">`
- `<link href="style.css" rel="stylesheet alternate">`
- `<link href="dark.css" rel="stylesheet" media="(prefers-color-scheme: dark)">`
- `<link href="style.css" rel="stylesheet" disabled>`

### Style element

- `<style>a { color: inherit; }</style>`

### Inline styles

- `<a style="anchor-name: episode-0;">Episode title</a>`

### CSSOM API

- `document.adoptedStyleSheets`
- `sheet.insertRule()` on a `<style>` element's sheet

### CSS imports

- `@import url(style.css)`
- `@import url(style.css) (prefers-color-scheme: dark)`
- `@import url(style.css) supports(display: grid)`
- `@import url(style.css) layer(third-party)`
- `@import` nested inside another imported stylesheet

### Frames

- `<iframe src="page.html">`
- `<frameset><frame src="left.html"></frameset>`

### Web components

- `this.shadowRoot.adoptedStyleSheets` (e.g. `MyCustomElement`)
- `<link>`, `<style>`, `@import` and inline `style` attributes inside an open shadow root
