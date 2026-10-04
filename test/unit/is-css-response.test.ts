import { describe, expect, test } from 'vitest'
import { is_css_response } from '../../src/network-css.ts'
import { fake_response } from '../helpers/fakes.ts'

describe('is_css_response', () => {
	test('is true for an ok() response with a text/css content-type', () => {
		expect(is_css_response(fake_response({ headers: { 'content-type': 'text/css' } }))).toBe(true)
	})

	test('is true for text/css with a charset parameter, case-insensitively', () => {
		expect(
			is_css_response(fake_response({ headers: { 'content-type': 'TEXT/CSS; charset=utf-8' } })),
		).toBe(true)
	})

	test('is false when the response is not ok()', () => {
		expect(
			is_css_response(fake_response({ status: 404, headers: { 'content-type': 'text/css' } })),
		).toBe(false)
	})

	test('is false when there is no content-type header', () => {
		expect(is_css_response(fake_response({ headers: {} }))).toBe(false)
	})

	test('is false for a non-css content type', () => {
		expect(
			is_css_response(fake_response({ headers: { 'content-type': 'application/json' } })),
		).toBe(false)
	})
})
