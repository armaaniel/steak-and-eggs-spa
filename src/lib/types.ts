import type { DatacatRange } from '../hooks/useDatacatRange'

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
	source?:string
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

export interface DependencyNode {
	id:string
	title:string
	role:string
	status:'good' | 'warn' | 'critical' | 'none'
	statusLabel:string
	metrics:{label:string; value:string; points?:{at:string; value:number}[]; color?:string}[]
	note?:string
}

export type Detail =
	| {kind:'trace'; trace:Trace}
	| {kind:'cable'; connection:ConnectionWithID}
	| {kind:'dependency'; node:DependencyNode}
	| IngesterDetail

export interface OutletContextType {
	detail: Detail | null
	setDetail: React.Dispatch<React.SetStateAction<Detail | null>>
	range: DatacatRange
	setRange: (range: DatacatRange) => void
	usedRedis: boolean
	usedApi: boolean
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
	bucketEnd:string
	started:number
	completed:number
	failures:number
	expected:number
}

export interface CanarySlo {
	target:number
	good:number
	expected:number
	periodGood:number
	periodExpected:number
	budgetAllowed:number
	budgetUsed:number
}

export interface PolygonCalls {
	calls:number
	failures:number
	p50:number | null
	p99:number | null
	lastSuccessAt:string | null
}

export interface ServiceBucket {
	bucket:string
	requests:number
	errors:number
	p50:number | null
	p95:number | null
	p99:number | null
}

export interface SyntheticRun {
  runId: string
  startedAt: string
  requestCount: number
  failures: number
  result: 'pass' | 'fail' | null
}

export type Prices = {[symbol:string]:number}

export type Price = null | string | number
export type Open = null | string
export type Error = null | string

export interface DateRange {
	from:number
	to:number
}

export interface IngesterUptime {
	pct:number
	streamingSeconds:number
	idleSeconds:number
	downSeconds:number
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
	meanExcessMs:number | null
	meanProcessMs:number | null
	meanIdleMs:number | null
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
}

export interface IngesterConnection {
	connectionId:string
	bootId:string
	spawnedAt:string
	firstMessageAt:string | null
	lastMessageAt:string | null
	lastSeenAt:string
	state:string
	endedAt:string | null
	endedBy:string
	durationSeconds:number | null
	events:string | null
	p99MeanExcessMs:number | null
}

export interface RunMetricPoint {
	at:string
	minimum:number | null
	maximum:number | null
	average:number | null
}

export interface LoadRunSummary {
	runId:string
	route:string
	startedAt:string
	endedAt:string
	samples:number
}

export interface LoadCompareRow {
	bucket:string
	rps:number
	sent:number
	traced:number
	gap:number
	errors:number
	clientP50:number
	clientP99:number
	serverP50:number
	serverP99:number
}

export interface CableRunSummary {
	runId:string
	startedAt:string
	endedAt:string
	samples:number
}

export interface CableCompareRow {
	at:string
	published:number | null
	received:number | null
	clients:number | null
	expected:number | null
	peakClients:number | null
	p50LagMs:number | null
	p99LagMs:number | null
}

export interface IngesterLagPoint {
	at:string
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

export type IngesterDetail =
	| {kind:'boot'; boot:IngesterBoot; transitions:IngesterTransition[]; connections:IngesterConnection[]}
	| {kind:'connection'; connection:IngesterConnection; transitions:IngesterTransition[]}
