import { useState, useEffect } from 'react'

export default function usePagination<T>(items: T[], perPage: number) {
	const [currentPage, setCurrentPage] = useState(1)

	useEffect(() => {
		setCurrentPage(1)
	}, [items.length])

	const totalPages = Math.max(1, Math.ceil(items.length / perPage))
	const start = (currentPage - 1) * perPage
	const end = start + perPage
	const currentItems = items.slice(start, end)

	const next = () => setCurrentPage((p) => Math.min(p + 1, totalPages))
	const prev = () => setCurrentPage((p) => Math.max(p - 1, 1))
	const reset = () => setCurrentPage(1)

	return { currentItems, currentPage, totalPages, next, prev, reset }
}
