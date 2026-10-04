import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, normalize } from 'node:path'

const FIXTURES_ROOT = join(import.meta.dirname, '../fixtures')

const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.map': 'application/json',
}

function content_type_for(path: string): string {
	const ext = path.slice(path.lastIndexOf('.'))
	return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

export type RouteResponse = {
	body: string
	contentType?: string
	status?: number
}

export type FixtureServer = {
	url: string
	registerRoute(path: string, response: RouteResponse): void
	close(): Promise<void>
}

export async function createFixtureServer(): Promise<FixtureServer> {
	const routes = new Map<string, RouteResponse>()

	const server: Server = createServer(async (req, res) => {
		const path = (req.url ?? '/').split('?')[0] ?? '/'

		const route = routes.get(path)
		if (route) {
			res.writeHead(route.status ?? 200, {
				'content-type': route.contentType ?? 'text/html',
				'cache-control': 'no-store',
			})
			res.end(route.body)
			return
		}

		// Fall back to disk-backed fixtures under test/fixtures/**
		const file_path = normalize(join(FIXTURES_ROOT, path))
		if (!file_path.startsWith(FIXTURES_ROOT) || !existsSync(file_path)) {
			res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
			res.end('Not found')
			return
		}

		const body = await readFile(file_path)
		res.writeHead(200, { 'content-type': content_type_for(file_path), 'cache-control': 'no-store' })
		res.end(body)
	})

	await new Promise<void>((resolve) => {
		server.listen(0, resolve)
	})
	const address = server.address()
	if (address === null || typeof address === 'string') {
		throw new Error('Failed to determine fixture server address')
	}
	const url = `http://127.0.0.1:${address.port}`

	return {
		url,
		registerRoute(path, response) {
			routes.set(path, response)
		},
		close() {
			return new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()))
			})
		},
	}
}
