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
})
await browser.close()

const css = join(css_sources)
```