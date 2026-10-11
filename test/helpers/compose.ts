import type { FixtureServer } from './server.ts'
import { INGREDIENTS } from './ingredients.ts'

let counter = 0

function content_type_for(path: string): string {
	if (path.endsWith('.css')) return 'text/css'
	if (path.endsWith('.js')) return 'text/javascript'
	return 'text/plain'
}

/**
 * Builds one self-contained HTML page out of the chosen ingredients, registers
 * it (and any files the ingredients need) with the fixture server, and
 * returns the path to navigate to.
 */
export function composePage(server: FixtureServer, ids: string[]): string {
	const chosen = ids.map((id) => {
		const ingredient = INGREDIENTS.find((candidate) => candidate.id === id)
		if (!ingredient) throw new Error(`Unknown ingredient: ${id}`)
		return ingredient
	})

	for (const ingredient of chosen) {
		for (const [path, content] of Object.entries(ingredient.files ?? {})) {
			server.registerRoute(path, { body: content, contentType: content_type_for(path) })
		}
	}

	const head = chosen.map((ingredient) => ingredient.head ?? '').join('\n')
	const body_end = chosen.map((ingredient) => ingredient.bodyEnd ?? '').join('\n')

	const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>permutation</title>
${head}
</head>
<body>
${body_end}
</body>
</html>`

	const path = `/permutations/${counter++}.html`
	server.registerRoute(path, { body: html, contentType: 'text/html' })
	return path
}
