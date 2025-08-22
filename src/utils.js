export const toReadable = (value) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseInt(value)
	
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
		return number.toLocaleString()
	}
}

export const toTwo = (value) => {
	return parseFloat(value).toFixed(2)
}

export const toPnl = (value) => {
	const number = parseFloat(value)
	
	if (isNaN(number)) {
		return '-'
	}
	
	 if (number < 1 && number !== 0) {
		return `$${number.toLocaleString('en-us', {maximumFractionDigits:4})}`
	} else {
		return `$${number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})}`
	}
}		
	
export const toCurrency = (value) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseFloat(value)
	
	if (isNaN(number)) {
		return 'N/A'
	}
	
	if (number < 1 && number !== 0 && number >=-1) {
		return number.toLocaleString('en-us', {maximumFractionDigits:4})
	} else {
		return number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})
	}
}



export const toPercent = (price, open) => {
	if (!price || !open) return null;
	
	if (isNaN(price)) {
		return 'N/A%'
	}
	
	const percentage = ((price - open) / open) * 100;
	
	const decimals = Math.abs(percentage) < 0.01 ? 4 : 2;
	
	if (percentage < 0) {
		return `${percentage.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})}%`
	} else {
		return `+${percentage.toLocaleString('en-us', {minimumFractionDigits:decimals, maximumFractionDigits:decimals})}%`
	}
}
	

export const toPortfolio = (value) => {
	
	if (value === null || value === undefined) {
		return null
	}
	
	const number = parseFloat(value)
	
	if (isNaN(number)) {
		return 'N/A'
	}
	
	if (number < 1 && number !== 0) {
		return `${number.toLocaleString('en-us', {maximumFractionDigits:4})} USD`
	} else {
		return `${number.toLocaleString('en-us', {minimumFractionDigits:2, maximumFractionDigits:2})} USD`
	}
}
