import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { scrape_css } from '../../src/index.ts'
import { closeBrowser, newPage, type TestPage } from '../helpers/browser.ts'
import { composePage } from '../helpers/compose.ts'
import { INGREDIENTS } from '../helpers/ingredients.ts'
import { powerset } from '../helpers/powerset.ts'
import { createFixtureServer, type FixtureServer } from '../helpers/server.ts'

const combos = powerset(INGREDIENTS.map((ingredient) => ingredient.id))

function ingredient_by_id(id: string) {
	const ingredient = INGREDIENTS.find((candidate) => candidate.id === id)
	if (!ingredient) throw new Error(`Unknown ingredient: ${id}`)
	return ingredient
}

describe('CSS source permutations', () => {
	let server: FixtureServer
	let page: TestPage

	beforeAll(async () => {
		server = await createFixtureServer()
	})

	afterAll(async () => {
		await server.close()
		await closeBrowser()
	}, 30000)

	beforeEach(async () => {
		page = await newPage()
		// import-media-match assumes a light color scheme
		await page.emulateMedia({ colorScheme: 'light' })
	})

	afterEach(async () => {
		await page.close()
	})

	test.each(combos.map((combo) => [combo] as const))('combo: %s', async (ids) => {
		const path = composePage(server, ids)
		const result = await scrape_css(page, `${server.url}${path}`)
		const combined = result.join('\n')

		const chosen = ids.map((id) => ingredient_by_id(id))

		for (const ingredient of chosen.filter((ingredient) => ingredient.implemented)) {
			expect(combined, `expected "${ingredient.id}" to be captured`).toContain(ingredient.expectedCss)
		}

		for (const ingredient of chosen.filter((ingredient) => !ingredient.implemented)) {
			expect(combined, `"${ingredient.id}" is not implemented yet and should not appear`).not.toContain(
				ingredient.expectedCss,
			)
		}
	})
})
