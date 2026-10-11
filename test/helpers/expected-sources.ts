import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CSSSource } from '../../src/css-source.types.ts'
import type { FixtureServer } from './server.ts'

const FIXTURES_ROOT = join(import.meta.dirname, '../fixtures')

/** Loads a fixture's `expected.json` (an array of `CSSSource` objects with
 * root-relative `url`/`href` fields) and resolves those fields against the
 * running fixture server, whose origin and port vary per test run. */
export function load_expected_sources(server: FixtureServer, fixture_dir: string): CSSSource[] {
	const file_path = join(FIXTURES_ROOT, fixture_dir, 'expected.json')
	const sources = JSON.parse(readFileSync(file_path, 'utf-8')) as Array<Record<string, unknown>>
	for (const source of sources) {
		if (typeof source.url === 'string') {
			source.url = `${server.url}${source.url}`
		}
		if (typeof source.href === 'string') {
			source.href = `${server.url}${source.href}`
		}
	}
	return sources as CSSSource[]
}
