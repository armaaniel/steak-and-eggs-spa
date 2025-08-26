import '../../stylesheets/desktop/addwithdraw.css'
import { createPortal } from 'react-dom'
import React, { useState } from 'react'
import { NumericFormat } from 'react-number-format'

const AddButton = ({getPortfolioData, getChartData, balance}) => {
	
    const API = import.meta.env.VITE_API
    
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [amount, setAmount] = useState('')
	const [error, setError] = useState(null)
	
	const token = localStorage.getItem('authToken')
	
	const openDialog = () => setIsOpen(true);
	const closeDialog = () => {
		setIsOpen(false);
		setError(null)
		setAmount('')
	}	
	
	const handleChange = (values) => {
		setAmount(values.value)
	}
	
    const handleAllowed = values => {
		if (values.floatValue === undefined) return true;
		return values.floatValue <= 1000000000000
	}
	
	const insufficient = balance < parseFloat(amount)
	const invalidAmount = amount === ''
	
	async function handleSubmit(e) {
		e.preventDefault();
		setIsSubmitting(true)
		setError(null)
		try {
			const response = await fetch(`${API}/withdraw`, {
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
				const errorData = await response.json()
				setError(errorData.error)
			}
		} catch (error) {
			setError("Unable to process withdrawal, try again")
		} finally {
			setIsSubmitting(false)
		}
	}
				
	return (
		
		<> 
		
		<button className='add-withdraw-button' onClick={openDialog}>
			Withdraw Funds
		</button>
				
		{isOpen && document.body && createPortal(
			
		<div>
			<div className='background-overlay'>
			</div>
				
			<div className='modal-dialog'>
			
				<div className='modal-header'>
					<h2>Withdraw Funds</h2>
					{error && (<div className='insufficient'>{error}</div>)}	
					{insufficient && (<div className='insufficient'>Not enough funds to withdraw </div>)}		
				</div>
					
				<form className = 'modal-form' onSubmit={handleSubmit}>
						
					<div className='modal-amount-container'>
						<div className='modal-amount-container-two'>
							<div className='modal-amount-container-three'>
								<span className='modal-dollar'>$</span>
								<label className='modal-amount-label' htmlFor='amount'>Amount</label>
								<NumericFormat value={amount} onValueChange={handleChange} thousandSeparator={true} decimalScale={2}
								className='modal-amount-input' allowNegative={false} placeholder='0.00' suffix=' USD'
							    isAllowed={handleAllowed}/>
							</div>
						</div>
					</div>
					
					<div className='modal-submit'>
						<button type='submit' className={`aw-submit ${isSubmitting ? 'submitting' : ''}`}
						disabled={isSubmitting || insufficient || invalidAmount}>
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
