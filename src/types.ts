export interface Position {
	average_price: string
	shares: number
	symbol: string
}

export interface ChartData {
	date:string
	value:number
}

export interface Positions {
	average_price: string
	name: string
	open: number
	price: number
	shares: number
	symbol: string
}

export interface UserData {
	position?: Position
	balance: string
}

export interface TickerData {
	exchange:string
	name:string
	ticker_type:string
}


export type Prices = {[symbol:string]:number}

export type Price = null | string | number
export type Open = null | string
export type Error = null | string


