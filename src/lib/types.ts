export interface Position {
	average_price: string
	shares: number
	symbol: string
}

export interface Breakdown {
	duration:number
	used_redis?:boolean
	used_db?:boolean
	used_api?:boolean
	operation?:string	
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

export interface Trace {	
	id:string
	createdAt:string
	endpoint:string
	duration:number
	controller:string
	action:string
	status:number
	dbRuntime:number
	viewRuntime:number
	breakdown?: Record<string, Breakdown>
}

export interface Connection {
	startedAt: string
	connectionState: string
	subscriptions: Subscription[]
}

export interface Subscription {
	channel: string
	symbol: string
}

export interface ConnectionWithID extends Connection {
  id: number
}

export interface OutletContextType {
	selectedTrace: Trace | null
	setSelectedTrace: React.Dispatch<React.SetStateAction<Trace | null>>
	selectedConnection: ConnectionWithID | null
	setSelectedConnection: React.Dispatch<React.SetStateAction<ConnectionWithID | null>>
	loaded: boolean
    setLoaded: React.Dispatch<React.SetStateAction<boolean>>
	
}

export interface Column<T> {
	key:string
	label:string
	sortable:boolean
	render: (trace:T) => string | number
}	

export interface TraceSummary {
	route:string
	cleanRoute:string
	p99:number
	totalRequests:number
	cacheHitRate:number | null
}

export interface SyntheticBucket {
	bucket:string
	started:number
	completed:number
	failures:number
	expected:number
}

export interface SyntheticRun {
	userId:string
	startedAt:string
	requestCount:number
	failures:number
	completed:boolean
}




export type Prices = {[symbol:string]:number}

export type Price = null | string | number
export type Open = null | string
export type Error = null | string


