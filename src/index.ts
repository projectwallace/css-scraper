import type { PageLike, ResponseLike } from './types.ts'

type ScraperOptions = {
	exclude_unused_css?: boolean
}

export async function scrape_css(page: PageLike, url: string, options: ScraperOptions = {}) {
	// TODO: feature detect page.coverage
	// await page.coverage.startCSSCoverage()
	const css_requests: ResponseLike[] = []

	page.on('response', (response) => {

		if (response.ok()) {
			const headers = response.headers()
			const content_type = headers['content-type']
			if (typeof content_type === 'string' && content_type.toLowerCase().startsWith('text/css')) {
				css_requests.push(response)
			}
		}
	})

	await page.goto(url)
	const responses = await Promise.all(css_requests.map(r => r.text()))
	// const coverage = await page.coverage.stopCSSCoverage()
	return responses
}
