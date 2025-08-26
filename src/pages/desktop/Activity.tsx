import '../../stylesheets/desktop/activity.css'

import {useState, useEffect} from 'react'
import { toCurrency, toPnl }  from '../../utils.js'

function Activity() {
	
	const API = import.meta.env.VITE_API
	
	const token = localStorage.getItem('authToken')
	
	const [activityData, setActivityData] = useState(null)
	
	const [error, setError] = useState(null)
	
	const [isLoaded, setIsLoaded] = useState(null)
	
	const [currentPage, setCurrentPage] = useState(1)
	
	const recordsPerPage = 15
	
	const back = () => {
		setCurrentPage(currentPage - 1)
	}
	
	const forward = () => {
		setCurrentPage(currentPage + 1)
	}
	
    const startRecord = (currentPage - 1) * recordsPerPage;
	
    const endRecord = startRecord + recordsPerPage;
	
	useEffect(() => {
		async function getActivity() {
			setError(null)
			try {
				const response = await fetch(`${API}/activitydata`, {
					headers: {authToken: token}
				})
				if (response.ok) {
					const data = await response.json()
					setActivityData(data)
				} else {
					const data = await response.json()
					setActivityData(data)
					setError("Unable to fetch transactions, please try again")					
				}
			} catch (error) {
				setError("Unable to fetch transactions, please try again")
				setActivityData([])
			} finally {
				setIsLoaded(true)
			}
		}
		getActivity();
	}, [])
	
	const totalPages = Math.ceil(activityData?.length / recordsPerPage || 1);
	const currentPageTraces = activityData?.slice(startRecord, endRecord)
											
	return (
	
	<div className='activity-container'>
			
	<table className={`activity-stock-table ${isLoaded ? 'loaded' : ''}`}>
		<thead>
			<tr className='activity-header-row'>
			<th className='activity-row-heading'>Transaction Type</th>
			<th className='activity-row-heading'>Symbol</th>
			<th className='activity-row-heading'>Quantity</th>	
			<th className='activity-row-heading'>Market Price</th>	
			<th className='activity-row-heading'>Value</th>	
			<th className='activity-row-heading'>Realized PnL</th>	
			<th className='activity-row-heading'>Date & Time</th>			
				
			</tr>
		</thead>
		
		{isLoaded && !error && activityData.length === 0 && (
			<tbody>
			<tr className='activity-row'><td className='activity-cell' colSpan={7}>
			<p className='details-text'>No Activites Yet</p>
			</td></tr>
			</tbody>
			)}
		
		{isLoaded && error && (
			<tbody>
			<tr className='activity-row'><td className='activity-cell' colSpan={7}>
			<p className='details-text'>{error}</p>
			</td></tr>
			</tbody>
			)}
					
		<tbody>
		
		{currentPageTraces?.map(transaction => (
			
			<tr key={transaction?.id} className='activity-row'>
			
			<td className='activity-cell'>
			<p className="details-text">{transaction?.transaction_type}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">{transaction?.symbol}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">{transaction?.quantity?.toLocaleString()}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">${toCurrency(transaction?.market_price)}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">${toCurrency(transaction?.value)}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">{toPnl(transaction?.realized_pnl)}</p>
			</td>
			
			<td className='activity-cell'>
			<p className="details-text">{transaction?.date}</p>
			</td>
			
			</tr>
		
		))}
		
		</tbody>
		</table>
		
		{activityData && (
		<div className='pagination-container'>
			<button className='page-button' onClick={back} disabled={currentPage === 1}> Previous </button>
			<span className='page-span'>Page {currentPage} of {totalPages}</span>
			<button className='page-button' onClick={forward} disabled={currentPage === totalPages}> Next </button>
		</div>	
		)}
		
		</div>
	
	)

}

export default Activity;