export interface RequestLike {
	url(): string
	method(): string
	resourceType(): string
	headers(): Record<string, string>
}

export interface ResponseLike {
	ok(): boolean
	url(): string
	status(): number
	headerValue(): Promise<null | string>
	headers(): Record<string, string>
	request(): RequestLike
	text(): Promise<string>
}

/** A single browsing context: the top-level document, or a nested <iframe>/<frame>. */
export interface FrameLike {
	url(): string
	evaluate<R>(fn: () => R | Promise<R>): Promise<R>
}

export interface PageLike {
	goto(
		url: string,
		options?: {
			waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
			timeout?: number
		},
	): Promise<unknown>
	/** Every frame attached to the page, including the main frame itself, each with its own document. */
	frames(): FrameLike[]
	on(event: 'request', listener: (request: RequestLike) => void): unknown
	on(event: 'response', listener: (response: ResponseLike) => void): unknown
}
