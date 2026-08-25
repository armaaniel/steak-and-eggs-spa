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
	selectedIngesterDetail: IngesterDetail | null
	setSelectedIngesterDetail: React.Dispatch<React.SetStateAction<IngesterDetail | null>>
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

export interface IngesterUptime {
	pct:number
	streamingSeconds:number
	idleSeconds:number
	downSeconds:number
	windowSeconds:number
}

export interface IngesterSpan {
	at:string
	bootId:string
	connectionId:string | null
	state:string
	seconds:number
}

export interface IngesterRatePoint {
	at:string
	eventsPerSec:number | null
	framesPerSec:number | null
	maxLagMs:number | null
	symbols:number | null
}

export interface IngesterBoot {
	bootId:string
	startedAt:string
	lastSeenAt:string
	durationSeconds:number
	connections:number
	reconnects:number
	exitState:string
	events:string | null
	peakLagMs:number | null
}

export interface IngesterConnection {
	connectionId:string
	bootId:string
	spawnedAt:string
	firstMessageAt:string | null
	lastSeenAt:string
	endedAt:string | null
	endedBy:string
	durationSeconds:number | null
}

export interface IngesterCause {
	cause:string
	count:number
}

export interface IngesterLagPoint {
	at:string
	maxExcessMs:number | null
	meanExcessMs:number | null
	sampledEvents:number | null
	symbols:number | null
}

export interface IngesterTransition {
	id:string
	at:string
	bootId:string
	connectionId:string | null
	state:string
	cause:string | null
	detail:Record<string, unknown> | null
}

// One selection for the whole ingester page rather than three parallel ones. The page owns
// the filtering, so each payload arrives self-contained and the panel just renders it.
export type IngesterDetail =
	| {kind:'boot'; boot:IngesterBoot; transitions:IngesterTransition[]; connections:IngesterConnection[]}
	| {kind:'connection'; connection:IngesterConnection; transitions:IngesterTransition[]}
	| {kind:'transition'; transition:IngesterTransition}
