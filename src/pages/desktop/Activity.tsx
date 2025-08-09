import '../../stylesheets/desktop/activity.css'

import {useState, useEffect} from 'react'

function Activity() {
	
	const token = localStorage.getItem('authToken')
	
	const [activityData, setActivityData] = useState(null)
	
	const [error, setError] = useState(null)
	
	const [isLoaded, setIsLoaded] = useState(null)
	
	const [currentPage, setCurrentPage] = useState(1)
	
	const recordsPerPage = 16
	
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
				const response = await fetch('http://localhost:3000/activitydata', {
					headers: {authToken: token}
				})
				if (response.ok) {
					const data = await response.json()
					setActivityData(data)
					setIsLoaded(true)
					console.log(data)
				} else {
					const errorData = await response.json()
				}
			} catch (error) {
				setError("Something went wrong, please try again later")
			}
		}
		getActivity();
	}, [])
	
	const totalPages = Math.ceil(activityData?.length / recordsPerPage);
	const currentPageTraces = activityData?.slice(startRecord, endRecord)
	
	//if (!activityData) return null
//	if (error) return
											
	return (
	
	<div className='activity-container'>
			
	<table class={`activity-stock-table ${isLoaded ? 'loaded' : ''}`}>
		<thead>
			<tr class='activity-row'>
			<th class='activity-row-heading'>Transaction Type</th>
			<th class='activity-row-heading'>Symbol</th>
			<th class='activity-row-heading'>Date & Time</th>
			<th class='activity-row-heading'>Quantity</th>	
			<th class='activity-row-heading'>Value</th>	
				
			</tr>
		</thead>	
	
		<tbody>
		
		{currentPageTraces?.map(transaction => (
			
			<tr key={transaction?.id} class ='activity-row'>
			
			<td class='activity-cell'>
			<p class="details-text">{transaction?.transaction_type}</p>
			</td>
			
			<td class='activity-cell'>
			<p class="details-text">{transaction?.symbol}</p>
			</td>
			
			<td class='activity-cell'>
			<p class="details-text">{transaction?.date}</p>
			</td>
			
			<td class='activity-cell'>
			<p class="details-text">{transaction?.quantity}</p>
			</td>
			
			<td class='activity-cell'>
			<p class="details-text">{transaction?.value}</p>
			</td>
			
			</tr>
		
		))}
		
		</tbody>
		</table>
				
		<div className='pagination-container'>
			<button className='page-button' onClick={back} disabled={currentPage === 1}> Previous </button>
			<span className='page-span'>Page {currentPage} of {totalPages}</span>
			<button className='page-button' onClick={forward} disabled={currentPage === totalPages}> Next </button>
		</div>	
		
		</div>
	
	)

}

export default Activity;