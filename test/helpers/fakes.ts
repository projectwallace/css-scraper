import type { PageLike, RequestLike, ResponseLike } from '../../src/types.ts'

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
		headerValue: () => Promise.resolve(headers['content-type'] ?? null),
		headers: () => headers,
		request: () => request,
		text: () => {
			if (typeof text === 'function') return text()
			return Promise.resolve(text)
		},
	}
}

export type FakePageInit = {
	responses?: ResponseLike[]
	goto?: (url: string) => Promise<unknown>
}

export function fake_page(init: FakePageInit = {}): PageLike {
	const response_listeners = new Set<(response: ResponseLike) => void>()
	let current_url = 'about:blank'

	return {
		async goto(url) {
			current_url = url
			const result = await init.goto?.(url)
			for (const response of init.responses ?? []) {
				for (const listener of response_listeners) listener(response)
			}
			return result
		},
		frames() {
			return [{ url: () => current_url, evaluate: () => Promise.resolve([] as never) }]
		},
		on(event, listener) {
			if (event === 'response') response_listeners.add(listener as (response: ResponseLike) => void)
			return this
		},
	}
}
