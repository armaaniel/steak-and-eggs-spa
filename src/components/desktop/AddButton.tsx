import '../../stylesheets/desktop/addwithdraw.css'
import { createPortal } from 'react-dom'
import React, { useState } from 'react'
import { toCurrency }  from '../../utils.js'


const AddButton = ({getPortfolioData, getChartData}) => {
    
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [amount, setAmount] = useState('')
	
	const token = localStorage.getItem('authToken')
	
	
	const openDialog = () => setIsOpen(true);
	const closeDialog = () => setIsOpen(false);
	
	
	const handleKeyDown = (e) => {
		if (e.key === 'e' || e.key === 'E' || e.key === "+" || e.key === '-') {
			e.preventDefault()
		}
	}
	
	const handleChange = (e) => {
		setAmount(e.target.value.toLocaleString())
	}
	
	async function handleSubmit(e) {
		e.preventDefault();
		setIsSubmitting(true)
		try {
			const response = await fetch('http://localhost:3000/deposit', {
				method: 'POST', 
				headers: {'Content-Type':'application/json', authToken: token},
				body: JSON.stringify({amount: amount})
			})
			if (response.ok) {
				setAmount('')
				getPortfolioData()
				getChartData()
				closeDialog()
				} else {
				console.log(response.status)
				}
			} catch (error) {
				console.log(error)
			} finally {
				setIsSubmitting(false)
			}
		}
				
	return (
		
		<> 
		
		<button className='add-withdraw-button' onClick={openDialog}>
			Add Funds
		</button>
				
		{isOpen && document.body && createPortal(
			
		<div>
			<div className='background-overlay'>
			</div>
				
			<div className='modal-dialog'>
			
				<div className='modal-header'>
					<h2>Add Funds</h2>
				</div>
					
				<form className = 'modal-form' onSubmit={handleSubmit}>
						
					<div className='modal-amount-container'>
						<div className='modal-amount-container-two'>
							<div className='modal-amount-container-three'>
							<span className='modal-dollar'>$</span>
								<input type='number' name='amount' value={amount} onChange={handleChange} onKeyDown={handleKeyDown} min='0.01' step='0.01' 
								className='modal-amount-input'/>
								<label className='modal-amount-label' htmlFor='amount'>Amount</label>
								<span className='modal-currency'>USD</span>
							</div>
						</div>
					</div>
					
					<div className='modal-submit'>
						<button type='submit' className='aw-submit' disabled={isSubmitting}>
							Submit
						</button>
					</div>
			
				</form>
			
				<button className='close-button' onClick={closeDialog} disabled={isSubmitting}>
					X
				</button>
			
			</div>
		</div>,
		document.body	
		)}
		</>
	);
};

export default AddButton;
