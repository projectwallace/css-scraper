import { describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

describe('error handling', () => {
	test('silently ignores a rejected page.goto()', async () => {
		const page = fake_page({
			goto: () => {
				throw new Error('navigation failed')
			},
		})
		await expect(scrape_css(page, 'https://example.test')).resolves.toEqual([])
	})

	test('silently ignores a rejected response.text()', async () => {
		const page = fake_page({
			responses: [
				fake_response({
					headers: { 'content-type': 'text/css' },
					text: () => {
						throw new Error('body read failed')
					},
				}),
			],
		})
		await expect(scrape_css(page, 'https://example.test')).resolves.toEqual([])
	})
})
