import { useState, useEffect } from 'react'
import { getConsumer } from '../lib/consumer'
import type { Prices } from '../lib/types'

const usePriceSubscriptions = (symbols: string[]): Prices => {
	const [prices, setPrices] = useState<Prices>({})

	useEffect(() => {
		if (symbols.length === 0) return

		const consumer = getConsumer()
		const subscriptions = symbols.map((symbol) =>
			consumer.subscriptions.create(
				{ channel: 'PriceChannel', symbol },
				{
					received(price: number) {
						setPrices((prev) => ({ ...prev, [symbol]: price }))
					},
				},
			)
		)

		return () => subscriptions.forEach((s) => s.unsubscribe())
	}, [symbols.join(',')])

	return prices
}

export default usePriceSubscriptions
