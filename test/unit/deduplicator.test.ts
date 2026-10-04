import { describe, expect, test } from 'vitest'
import { create_deduplicator } from '../../src/index.ts'

describe('create_deduplicator', () => {
	test('reports the first (url, css) pair as not a duplicate', () => {
		const deduplicator = create_deduplicator()
		expect(deduplicator.is_duplicate('https://example.test/a.css', '.a{}')).toBe(false)
	})

	test('reports an identical (url, css) pair as a duplicate on a later call', () => {
		const deduplicator = create_deduplicator()
		deduplicator.is_duplicate('https://example.test/a.css', '.a{}')
		expect(deduplicator.is_duplicate('https://example.test/a.css', '.a{}')).toBe(true)
	})

	test('treats different css at the same url as not a duplicate', () => {
		const deduplicator = create_deduplicator()
		deduplicator.is_duplicate('https://example.test/a.css', '.a{}')
		expect(deduplicator.is_duplicate('https://example.test/a.css', '.b{}')).toBe(false)
	})

	test('treats identical css at different urls as not a duplicate', () => {
		const deduplicator = create_deduplicator()
		deduplicator.is_duplicate('https://example.test/a.css', '.a{}')
		expect(deduplicator.is_duplicate('https://example.test/b.css', '.a{}')).toBe(false)
	})
})
