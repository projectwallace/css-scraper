/** Returns every non-empty subset of `items`. */
export function powerset<T>(items: T[]): T[][] {
	const result: T[][] = []
	const n = items.length
	for (let mask = 1; mask < 1 << n; mask++) {
		const subset: T[] = []
		for (let i = 0; i < n; i++) {
			if (mask & (1 << i)) {
				const item = items[i]
				if (item !== undefined) subset.push(item)
			}
		}
		result.push(subset)
	}
	return result
}
