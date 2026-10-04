import { describe, expect, test } from 'vitest'
import { collect_link_hrefs } from '../../src/index.ts'
import { fake_page } from '../helpers/fakes.ts'

describe('collect_link_hrefs', () => {
	test('resolves to the hrefs reported by the page', async () => {
		const hrefs = ['https://example.test/a.css', 'https://example.test/b.css']
		const page = fake_page({ link_hrefs: hrefs })
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set(hrefs))
	})

	test('resolves to an empty set when the page has no stylesheet links', async () => {
		const page = fake_page({ link_hrefs: [] })
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set())
	})

	test('deduplicates repeated hrefs', async () => {
		const href = 'https://example.test/a.css'
		const page = fake_page({ link_hrefs: [href, href] })
		const result = await collect_link_hrefs(page)
		expect(result).toEqual(new Set([href]))
	})
})
