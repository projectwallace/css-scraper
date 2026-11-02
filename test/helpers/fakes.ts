import { read_page_css, type CSSWalkEntry } from '../../src/browser.ts'
import type { FrameLike, PageLike, RequestLike, ResponseLike } from '../../src/types.ts'

export type FakeResponseInit = {
	url?: string
	status?: number
	headers?: Record<string, string>
	text?: string | (() => Promise<string>)
}

export function fake_response(init: FakeResponseInit = {}): ResponseLike {
	const status = init.status ?? 200
	const headers = init.headers ?? {}
	const url = init.url ?? 'https://example.test/style.css'
	const text = init.text ?? ''

	const request: RequestLike = {
		url: () => url,
		method: () => 'GET',
		resourceType: () => 'stylesheet',
		headers: () => headers,
	}

	return {
		ok: () => status >= 200 && status < 300,
		url: () => url,
		status: () => status,
		// oxlint-disable-next-line unicorn/no-null -- ResponseLike's headerValue() is typed to return null
		headerValue: (name) => Promise.resolve(headers[name.toLowerCase()] ?? null),
		headers: () => headers,
		request: () => request,
		text: () => {
			if (typeof text === 'function') return text()
			return Promise.resolve(text)
		},
	}
}

type FakeFrameInit = {
	url?: string
	/** What the in-browser DOM walk returns, e.g. `{ type: 'link', href, rel, disabled }`. */
	dom_entries?: CSSWalkEntry[]
	/** Makes the DOM walk reject, like evaluating in a detached frame does. */
	error?: Error
}

export type FakePageInit = {
	responses?: ResponseLike[]
	/** Shorthand for a page with a single frame. */
	dom_entries?: CSSWalkEntry[]
	/** Several frames, instead of the single one `dom_entries` describes. */
	frames?: FakeFrameInit[]
	goto?: (url: string, options?: Parameters<PageLike['goto']>[1]) => Promise<unknown>
}

function fake_frame(init: FakeFrameInit, default_url: () => string): FrameLike {
	return {
		url: () => init.url ?? default_url(),
		// The fake only knows how to answer the DOM walk
		evaluate(fn) {
			if (fn !== (read_page_css as unknown)) {
				return Promise.reject(new Error('fake frame can only evaluate read_page_css'))
			}
			if (init.error) return Promise.reject(init.error)
			return Promise.resolve((init.dom_entries ?? []) as never)
		},
	}
}

export function fake_page(init: FakePageInit = {}): PageLike {
	const response_listeners = new Set<(response: ResponseLike) => void>()
	let current_url = 'about:blank'
	const frames = (init.frames ?? [{ dom_entries: init.dom_entries }]).map((frame_init) =>
		fake_frame(frame_init, () => current_url),
	)

	return {
		async goto(url, options) {
			current_url = url
			const result = await init.goto?.(url, options)
			for (const response of init.responses ?? []) {
				for (const listener of response_listeners) listener(response)
			}
			return result
		},
		frames: () => frames,
		on(event, listener) {
			if (event === 'response') response_listeners.add(listener as (response: ResponseLike) => void)
			return this
		},
	}
}
