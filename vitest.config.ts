import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			// src/browser.ts runs inside the browser via Playwright, where Node's v8 coverage cannot see it
			exclude: ['test/**', 'src/browser.ts'],
		},
		projects: [
			{
				test: {
					name: 'unit',
					include: ['test/unit/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'integration',
					include: ['test/integration/**/*.test.ts'],
					exclude: ['test/integration/permutations.test.ts'],
					testTimeout: 15000,
				},
			},
			{
				test: {
					name: 'matrix',
					include: ['test/integration/permutations.test.ts'],
					testTimeout: 15000,
				},
			},
		],
	},
})
