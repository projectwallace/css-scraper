import { describe, expect, test, vi } from 'vitest'
import {
	collect_css,
	scrape_css,
	track_css_responses,
	type OnScrapeError,
} from '../../src/index.ts'
import { fake_page, fake_response } from '../helpers/fakes.ts'

const unreadable_response = (url: string) =>
	fake_response({
		url,
		headers: { 'content-type': 'text/css' },
		text: () => Promise.reject(new Error('body read failed')),
	})

describe('navigation', () => {
	test('scrape_css rejects with the error of a failed page.goto()', async () => {
		const page = fake_page({ goto: () => Promise.reject(new Error('navigation failed')) })
		await expect(scrape_css(page, 'https://example.test')).rejects.toThrow('navigation failed')
	})

	test('scrape_css forwards waitUntil and timeout to page.goto()', async () => {
		const goto = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const page = fake_page({ goto })
		await scrape_css(page, 'https://example.test', { waitUntil: 'networkidle', timeout: 5000 })
		expect(goto).toHaveBeenCalledWith('https://example.test', {
			waitUntil: 'networkidle',
			timeout: 5000,
		})
	})
})

describe('an unreadable response body', () => {
	test('is skipped, and the readable responses are still collected', async () => {
		const readable = fake_response({
			url: 'https://example.test/ok.css',
			headers: { 'content-type': 'text/css' },
			text: '.ok {}',
		})
		const page = fake_page({
			responses: [unreadable_response('https://example.test/bad.css'), readable],
		})
		const result = await scrape_css(page, 'https://example.test')
		expect(result.map((source) => source.css)).toEqual(['.ok {}'])
	})

	test('is reported to on_error', async () => {
		const on_error = vi.fn<OnScrapeError>()
		const page = fake_page({ responses: [unreadable_response('https://example.test/bad.css')] })
		await scrape_css(page, 'https://example.test', { on_error })
		expect(on_error).toHaveBeenCalledExactlyOnceWith({
			source: 'response',
			url: 'https://example.test/bad.css',
			error: new Error('body read failed'),
		})
	})

	test('does not throw when nobody listens for errors', async () => {
		const page = fake_page({ responses: [unreadable_response('https://example.test/bad.css')] })
		await expect(scrape_css(page, 'https://example.test')).resolves.toEqual([])
	})
})

describe('an unreadable frame', () => {
	const frames = [
		{ url: 'https://example.test/', dom_entries: [{ type: 'style' as const, css: '.main {}' }] },
		{ url: 'https://example.test/detached.html', error: new Error('Frame was detached') },
		{
			url: 'https://example.test/after.html',
			dom_entries: [{ type: 'inline' as const, css: 'a: b' }],
		},
	]

	test('is skipped, and the other frames are still collected', async () => {
		const page = fake_page({ frames })
		const result = await collect_css(page, track_css_responses(page))
		expect(result.map((source) => source.css)).toEqual(['.main {}', 'a: b'])
	})

	test('is reported to on_error', async () => {
		const on_error = vi.fn<OnScrapeError>()
		const page = fake_page({ frames })
		await collect_css(page, track_css_responses(page), { on_error })
		expect(on_error).toHaveBeenCalledExactlyOnceWith({
			source: 'frame',
			url: 'https://example.test/detached.html',
			error: new Error('Frame was detached'),
		})
	})
})
