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
	headerValue(name: string): Promise<null | string>
	headers(): Record<string, string>
	request(): RequestLike
	text(): Promise<string>
}

/** A single browsing context: the top-level document, or a nested <iframe>/<frame>. */
export interface FrameLike {
	url(): string
	evaluate<R, A = undefined>(fn: (arg: A) => R | Promise<R>, arg?: A): Promise<R>
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

/** Something that went wrong while collecting, and was skipped so the rest of the page could
 * still be collected. */
export interface ScrapeError {
	/** `frame`: a frame's DOM could not be read. `response`: a stylesheet response's body could not be read. */
	source: 'frame' | 'response'
	/** The URL of the frame or the response. */
	url: string
	error: unknown
}

export type OnScrapeError = (error: ScrapeError) => void
