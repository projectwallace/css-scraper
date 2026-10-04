import { describe, expect, test } from 'vitest'
import { build_source } from '../../src/index.ts'

describe('build_source', () => {
	test('tags a url present in link_hrefs as "link"', () => {
		const url = 'https://example.test/style.css'
		const result = build_source(url, '.a{}', new Set([url]))
		expect(result).toEqual({ type: 'link', href: url, url, rel: 'stylesheet', css: '.a{}' })
	})

	test('tags a url absent from link_hrefs as "import"', () => {
		const url = 'https://example.test/imported.css'
		const result = build_source(url, '.b{}', new Set())
		expect(result).toEqual({ type: 'import', href: url, url, css: '.b{}' })
	})
})
