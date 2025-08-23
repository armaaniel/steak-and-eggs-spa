import React, { useState, useEffect } from "react";
import { toCurrency }  from '../../utils.js'
import { NumericFormat } from 'react-number-format'
import '../../stylesheets/desktop/buysell.css'

const BuySell = ({getUserData, balance, position, price, name, symbol, token}) => {
	
  const [currentState, setCurrentState] = useState({ action: "buy", step: 1 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState(null)
      
  const [quantity, setQuantity] = useState('');
  
  const [orderData, setOrderData] = useState(null)
  
  const [time, setTime] = useState(null)
                
  const estimatedCost = (Number(quantity) || 0) * price;
  
  const free = (estimatedCost === 0) || isNaN(estimatedCost)
  
  const hasInsufficientFunds = (estimatedCost > balance) || isNaN(balance);
  
  const hasInsufficientShares = quantity > (position?.shares || 0)
  
  const isQuantityInvalid = () => {
    if (quantity === '') return true;
}

  const handleChange = (values) => {
	  setQuantity(values.value)
  }
  
  const handleAllowed = (values) => {
	  if (values.floatValue === undefined) return true;
	  return values.floatValue <= 100000000000;
  }
    
  const quantityInvalid = isQuantityInvalid();

  const nextStep = () =>
    setCurrentState({ ...currentState, step: currentState.step + 1 });
  const prevStep = () =>
    setCurrentState({ ...currentState, step: currentState.step - 1 });
	
  const buyState = () => setCurrentState({ action: "buy", step: 1 });
  const sellState = () => setCurrentState({ action: "sell", step: 1 });
  
  const resetState = () => {
	  setCurrentState({ action: "buy", step: 1 });
	  setError(null)
	  setQuantity('')
  }
  	  
  async function handleSubmit(e) {
	  e.preventDefault();
	  setIsSubmitting(true);
	  setError(null)
	  const action = currentState.action
	  try {
		  const response = await fetch(`http://localhost:3000/stocks/${symbol}/${action}`, {
			  method: 'POST',
			  headers: {'Content-Type': 'application/json', authToken: token},
			  body: JSON.stringify({name: name, quantity: quantity})
		  })
		  if (response.ok) {
			  const data = await response.json()
			  setOrderData(data)
		  } else {
			  const errorData = await response.json()
			  setError(errorData.error)
		  } 
	  } catch (error) {
		  setError("Something went wrong, please try again later")
	  } finally {
		  setIsSubmitting(false)
		  getUserData()
		  setTime(new Date().toLocaleTimeString())
		  nextStep();
		  
	  }
  }
  	  
  useEffect(() => {
	  resetState();
  }, [symbol])
			  	  
    
  return (
    <>
	{currentState.step === 1 && (
	<div className='bs-parent-container'>
	
		<div className='bs-button-container'>
            <button onClick={buyState} className='buy-sell-button'>

				<div className='bs-text-parent'>
					<p className={currentState.action === 'buy' ? 'buy-sell-text active' : 'buy-sell-text'}>Buy</p>
				</div>
				
			</button>
			
            <button onClick={sellState} className='buy-sell-button'>
				<div className='bs-text-parent'>
					<p className={currentState.action === 'sell' ? 'buy-sell-text active' : 'buy-sell-text'}>Sell</p>
				</div>
			</button>
			
		</div>
		
		<div className='bs-gap-container'>
		
		<div className='bs-containers'>
		  	
			<div className='bs-width-wrapper'>
		  		<p>Order Type</p>
		  	</div>
			
		  	<div>
		  		{currentState.action === 'buy' ? <p>Market Buy</p> : <p>Market Sell</p>}
		  	</div>
			
		</div>
				
		<div className='bs-containers'>

			<div className='bs-shares-wrapper'>
          		<label>Shares</label>
		  	</div>
			
          	<div className='shares-input-form'>
				<NumericFormat value={quantity} onValueChange={handleChange} thousandSeparator={true} decimalScale={2}
				className='shares-input' allowNegative={false} placeholder='0.00'
				isAllowed={handleAllowed}/>
          	</div>
			
		</div>
		
		<div className='bs-containers'>
		
			<div className='bs-width-wrapper'>
	  			{currentState.action === 'buy' ? <p>Estimated Cost</p> : <p>Estimated Value</p>}
		  	</div>
			
		  	<div>
		  		<p> ${toCurrency(estimatedCost)} USD </p>
		  	</div>
			
		</div>
		
		<div className='bs-next-parent'>
			{currentState.action === 'buy' ? 
			
			<button className={`next ${isSubmitting ? 'submitting' : ''}`} onClick={nextStep} disabled={hasInsufficientFunds || quantityInvalid || free}> 
				Next
			</button>
			:
            <button className={`next ${isSubmitting ? 'submitting' : ''}`} onClick={nextStep} disabled={hasInsufficientShares || quantityInvalid || free}>
				Next
			</button>
			}
			
			<hr className='bs-line' />		  
		
			<div className='bs-containers'>
		
				<div className='bs-width-wrapper'>
		  			{currentState.action === 'buy' ? <p>Available Cash</p> : <p>Available Shares</p>}
			  	</div>
			
			  	<div>
		  			{currentState.action === 'buy' ? <p className='est-cost'> ${toCurrency(balance)} USD </p> : <p>{position?.shares?.toLocaleString() || 0}</p>}	
			  	</div>
			
			</div>
			
		</div>
		
		
		
		  
		{currentState.action === 'buy' && hasInsufficientFunds && (
			<p>Insufficient funds for this purchase</p>
		)}
		
		{currentState.action === 'sell' && hasInsufficientShares && (
		  <p>Insufficient shares for this sale</p>
		)}
		
	</div>
	</div>
	)}
	
      {currentState.step === 2 && (
	  
	  <div className='bs-parent-container two'>
	  
	  	<div>
       		<button onClick={prevStep} className='bs-back-button'> 
			<p className='back-arrow'>←</p>
			<p>&nbsp;back</p>
			
			</button>
		</div>
		
		<div className='bs-gap-container'>
		  		  
		<div className='bs-containers'>
		  	
			<div className='bs-width-wrapper'>
		  		<p>Order</p>
		  	</div>
			
		  	<div>
		  		{currentState.action === 'buy' ? <p>Market Buy {symbol}</p> : <p>Market Sell {symbol}</p>}
		  	</div>
			
		</div>
		
		<div className='bs-containers'>
		
		  	<div className='bs-width-wrapper'>
		  		<p>Shares</p>
		  	</div>
			
		  	<div>
				<p>{parseFloat(quantity).toLocaleString()}</p>
		  	</div>
			
		</div>
		  
		<div className='bs-containers'>
		
			<div className='bs-width-wrapper'>
	  			{currentState.action === 'buy' ? <p>Estimated Cost</p> : <p>Estimated Value</p>}
		  	</div>
			
		  	<div>
		  		<p> ${toCurrency(estimatedCost)} USD </p>
		  	</div>
			
		</div>
		<hr className='bs-line' />		  
		
		
		<form onSubmit={handleSubmit}>
		  	<button type='submit' className={`next ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting || 
				(currentState.action === 'buy' && hasInsufficientFunds) || 
				(currentState.action === 'sell' && hasInsufficientShares)}>Submit</button>
		</form>
		
		{currentState.action === 'buy' && hasInsufficientFunds && (
			<p>Insufficient funds for this purchase</p>
		)}
		
		{currentState.action === 'sell' && hasInsufficientShares && (
		  <p>Insufficient shares for this sale</p>
		)}
		
	</div>
	</div>
	)}
	
	{currentState.step === 3 && !isSubmitting && !error && (
	<div className='bs-parent-container'>
	
		<div className='bs-success'>
			<p className='bs-success-text'>Order Success</p>
			<p>Today at {time}</p>
		</div>
		
		<div className='bs-containers'>
		  	
			<div className='bs-width-wrapper'>
		  		<p>Order</p>
		  	</div>
			
		  	<div>
		  		{currentState.action === 'buy' ? <p>Market Buy {orderData.symbol}</p> : <p>Market Sell {orderData.symbol}</p>}
		  	</div>
			
		</div>
		
	
		
		<div className='bs-containers'>
		
			<div className='bs-width-wrapper'>
	  			{currentState.action === 'buy' ? <p>Cost</p> : <p>Value</p>}
		  	</div>
			
		  	<div>
		  		<p> ${toCurrency(orderData.value)} USD </p>
		  	</div>
			
		</div>
		
		<div className='bs-containers'>
		
		  	<div className='bs-width-wrapper'>
		  		<p>Shares</p>
		  	</div>
			
		  	<div>
		  		<p>{orderData.quantity.toLocaleString()}</p>
		  	</div>
			
		</div>
		
		<div className='bs-containers'>
		
			<div className='bs-width-wrapper'>
	  			<p>Price Per Share</p> 
		  	</div>
			
		  	<div>
		  		<p> ${toCurrency(orderData.market_price)} USD </p>
		  	</div>
			
		</div>
		
		<hr className='bs-line' />
		
		<div>
		
			<button className='next' onClick={resetState}>
				Done
			</button>
			
		</div>
		
	</div>
	)}
	
	{currentState.step === 3 && !isSubmitting && error && (
		
		<div className='bs-parent-container three'>
	
			<div className='bs-success'>
				<p className='bs-success-text'>Order Failed</p>
				<p>Today at {time}</p>
			</div>
		
			<div className='bs-containers'>
		  	
				<div className='bs-width-wrapper'>
			  		<p>Order</p>
			  	</div>
			
			  	<div>
			  		{currentState.action === 'buy' ? <p>Market Buy {symbol}</p> : <p>Market Sell {symbol}</p>}
			  	</div>
			
			</div>
			
			<div className='bs-containers'>
		
			  	<div className='bs-width-wrapper'>
			  		<p>Shares</p>
			  	</div>
			
			  	<div>
			  		<p>{quantity}</p>
			  	</div>
			
			</div>
			
			<div className='bs-containers'>
		
				<div className='bs-width-wrapper'>
		  			<p>Message</p>
			  	</div>
			
				<div className='bs-width-wrapper'>
			  		<p> {error} </p>
			  	</div>
			
			</div>
			
			<div>
		
				<button className='next' onClick={resetState}>
					Done
				</button>
			
			</div>
		
		</div>
		)}
		
	
	</>
	
  );
};

export default BuySell;
