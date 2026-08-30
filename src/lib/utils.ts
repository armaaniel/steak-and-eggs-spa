import type { DateRange } from './types.ts'

export const toRange = (hours:number):DateRange => {
	const to = Date.now()
	return {from: to - hours * 60 * 60 * 1000, to}
}

export const toReadable = (value:number | null | string | undefined) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = Number(value)
		
	if (isNaN(number)) {
		return 'N/A'
	}
	
	if (number >= 1_000_000_000_000) {
		return `${(number / 1_000_000_000_000).toFixed(2)}T`
	} else if (number >= 1_000_000_000) {
		return `${(number / 1_000_000_000).toFixed(2)}B`
	} else if (number >= 1_000_000) {
		return `${(number / 1_000_000).toFixed(2)}M`
	} else {
		return value.toLocaleString()
	}
}

export const toPnl = (value: string | null) => {
	const number = parseFloat(value as any)
	
	if (isNaN(number)) {
		return '-'
	}
	
	if (number < 1 && number !== 0 && number >=-1) {
		return `$${number.toLocaleString('en-us', {maximumFractionDigits:4})}`
	} else {
		return `$${number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})}`
	}
}		
	
export const toCurrency = (value: number | string | null | undefined, decimals?: number) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseFloat(value as any)
	
	if (isNaN(number)) {
		return 'N/A'
	}
	
	if (decimals !== undefined) {
		return number.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})
	}
	
	if (number < 1 && number !== 0 && number >=-1) {
		return number.toLocaleString('en-us', {maximumFractionDigits:4})
	} else {
		return number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})
	}
}



export const toPercent = (price:string | null | number, open:string | null | number, fixed?: number) => {
	if (!price || !open) return null;
	
	const priceNum = Number(price)
	const openNum = Number(open)
	
	if (isNaN(priceNum)) {
		return 'N/A%'
	}
	
	const percentage = ((priceNum - openNum) / openNum) * 100;
	
	const decimals = fixed ?? (Math.abs(percentage) < 0.01 ? 3 : 2);
	
	if (percentage < 0) {
		return `${percentage.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})}%`
	} else {
		return `+${percentage.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})}%`
	}
}
	

export const toPortfolio = (value: string | number | undefined, decimals?: number) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseFloat(value as any)
	
	if (isNaN(number)) {
		return 'N/A'
	}
	
	if (decimals !== undefined) {
		return `$${number.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})} USD`
	}
	
	if (number < 1 && number !== 0) {
		return `$${number.toLocaleString('en-us', {maximumFractionDigits:4})} USD`
	} else {
		return `$${number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})} USD`
	}
}

export const toDuration = (seconds:number | null | undefined) => {
	if (seconds === null || seconds === undefined) {
		return '-'
	}
	
	const total = Math.round(seconds)
	
	if (total < 60) {
		return `${total}s`
	}
	
	const minutes = Math.floor(total / 60)
	
	if (minutes < 60) {
		return `${minutes}m ${total % 60}s`
	}
	
	const hours = Math.floor(minutes / 60)
	
	if (hours < 24) {
		return `${hours}h ${minutes % 60}m`
	}
	
	return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

export const toBucketLabel = (bucket:string) => {
	return new Date(bucket).toLocaleString('en-us', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})
}

export const toPnlCurrency = (value: number | string | null | undefined) => {
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseFloat(value as any)
	
	if (isNaN(number)) {
		return 'N/A'
	}
	
	return number.toLocaleString('en-us', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}
