# css-scraper

## Installation

```
npm install @projectwallace/css-scraper
```

## Usage

```js
import { chromium } from 'playwright'
import { track_css_responses, collect_css } from '@projectwallace/css-scraper'

const browser = await chromium.launch()
const page = await browser.newPage()

// Start tracking before the page starts loading, so no stylesheet response is missed
const css_responses = track_css_responses(page)

// Load the page however you like: throttling, headers, auth, scripted interactions...
await page.goto('https://projectwallace.com')

const css_sources = await collect_css(page, css_responses)
await browser.close()

const css = css_sources.map((css_source) => css_source.css).join('\n')
```

### Shorthand

When a plain `page.goto(url)` is all you need, `scrape_css` does the tracking, navigation and collecting in one call:

```js
import { chromium } from 'playwright'
import { scrape_css } from '@projectwallace/css-scraper'

const browser = await chromium.launch()
const page = await browser.newPage()

const css_sources = await scrape_css(page, 'https://projectwallace.com')
await browser.close()
```

`scrape_css` rejects when the navigation fails (DNS error, timeout, ...), so a failed scrape can be told apart from a page without CSS. It accepts `waitUntil` and `timeout`, which are passed to `page.goto()`.

### Errors while collecting

A frame or stylesheet body that cannot be read (a detached frame, a response body the browser already dropped) is skipped, so the rest of the page is still collected. Pass `on_error` to `scrape_css` or `collect_css` to find out about it:

```js
const css_sources = await collect_css(page, css_responses, {
	on_error({ source, url, error }) {
		// source is 'frame' or 'response'
		console.warn(`Skipped ${source} ${url}`, error)
	},
})
```

### Stylesheets without a recorded response

A `<link>` stylesheet that loaded, but has no response recorded by `track_css_responses` (it came from the cache or a service worker, or tracking started late), is fetched again from the page, as long as it is served as `text/css` and readable from the page. `@import`ed stylesheets cannot be recovered this way.

## Design principles

- Scrape every stylesheet the page declares, regardless of whether its conditions currently apply. A `<link href="dark.css" rel="stylesheet" media="(prefers-color-scheme: dark)">` is scraped even when the user prefers a light color scheme, because the browser downloads it anyway and the page's full CSS is what we want.
- Treat `@import` the same as linked style sheets, including import conditions like `@import url(modern.css) supports(display: grid);`. Every import is scraped regardless of its conditions.
- Get the CSS as close as possible to how it was shipped, bundled or authored.
  - Prefer the network response body and `<style>` text over anything read back from the browser.
  - Avoid transformations done by the browser, like unminification or color normalization (browser converts hex to rgb, etc.), which is why `document.stylesheets` is not used as a source.
  - Where no shipped text exists (rules added with `insertRule()`, constructed stylesheets adopted into a document or shadow root), the browser-serialized CSS is the only option and is marked as such in the source `type`.

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
