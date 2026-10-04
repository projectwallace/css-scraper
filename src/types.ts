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
export interface CSSCoverageEntry {
	url: string
	text?: string
	ranges: { start: number; end: number }[]
}

export interface PageLike {
	goto(
		url: string,
		options?: {
			waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
			timeout?: number
		},
	): Promise<unknown>
	evaluate<R>(fn: () => R | Promise<R>): Promise<R>
	coverage: {
		startCSSCoverage(options?: { resetOnNavigation?: boolean }): Promise<void>
		stopCSSCoverage(): Promise<CSSCoverageEntry[]>
	}
	on(event: 'request', listener: (request: RequestLike) => void): unknown
	on(event: 'response', listener: (response: ResponseLike) => void): unknown
	off(event: 'request', listener: (request: RequestLike) => void): unknown
	off(event: 'response', listener: (response: ResponseLike) => void): unknown
	close(): Promise<void>
}

export interface BrowserLike {
	newPage(): Promise<PageLike>
}
