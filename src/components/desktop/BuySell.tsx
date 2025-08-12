import React, { useState, useEffect } from "react";
import { toCurrency }  from '../../utils.js'
import '../../stylesheets/desktop/buysell.css'

const BuySell = ({getUserData, balance, position, price, name, symbol, token}) => {
	
  const [currentState, setCurrentState] = useState({ action: "buy", step: 1 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState(null)
      
  const [quantity, setQuantity] = useState('');
  
  const [orderData, setOrderData] = useState(null)
  
  const [pnl, setPnl] = useState(null)
              
  const estimatedCost = (quantity || 0) * price;
  
  const free = estimatedCost === 0
  
  const hasInsufficientFunds = estimatedCost > balance;
  
  const hasInsufficientQuantity = quantity > (position?.shares || 0)
  
  const isQuantityInvalid = () => {
    if (quantity === '' || quantity <= 0 || !Number.isInteger(quantity)) {
      return true;
    } else {
      return false;
    }
  };
  //deal with + - e case
  const updateQuantity = (e) => {
    if (e.target.value === '') 
		{ setQuantity(''); } 
	
	else 
		{ setQuantity(Number(e.target.value)); }
  };
  
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
			  console.log(data)
			  getUserData();
			  setCurrentState({...currentState, step: 3});
			  setQuantity('')
		  } else {
			  const errorData = await response.json()
			  setCurrentState({...currentState, step: 3});
			  setError(errorData.error)
		  } 
	  } catch (error) {
		  setError("Something Went Wrong, please try again later")
	  } finally {
		  setIsSubmitting(false)
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
		
		<div className='bs-gap-container-one'>
		
		<div className='bs-containers'>
		  	
			<div className='bs-width-wrapper'>
		  		<p>Order Type</p>
		  	</div>
			
		  	<div>
		  		{currentState.action === 'buy' ? <p>Market Buy</p> : <p>Market Sell</p>}
		  	</div>
			
		</div>
		
 			{/* user feedback needed for fractional shares or handle keypress to prevent dots */}  
		
		<div className='bs-containers'>

			<div className='bs-shares-wrapper'>
          		<label>Shares</label>
		  	</div>
			
          	<div className='shares-input-form'>
            	<input type="number" placeholder="0" name="quantity" min ='0' step="1" className='shares-input' 
				value={quantity} onChange={updateQuantity}/>
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
		
		<div>
			{currentState.action === 'buy' ? 
			
			<button className='next' onClick={nextStep} disabled={hasInsufficientFunds || quantityInvalid || free}> 
				Next
			</button>
			:
            <button className='next' onClick={nextStep} disabled={hasInsufficientQuantity || quantityInvalid || free}>
				Next
			</button>
			}
			
		</div>
		<hr className='bs-line' />		  
		
		<div className='bs-containers'>
		
			<div className='bs-width-wrapper'>
	  			{currentState.action === 'buy' ? <p>Available Cash</p> : <p>Available Shares</p>}
		  	</div>
			
		  	<div>
	  			{currentState.action === 'buy' ? <p> ${toCurrency(balance)} USD </p> : <p>{position?.shares || 0}</p>}	
		  	</div>
			
		</div>
		  
		{currentState.action === 'buy' && hasInsufficientFunds && (
			<p>Insufficient funds for this purchase</p>
		)}
		
		{currentState.action === 'sell' && hasInsufficientQuantity && (
		  <p>Insufficient shares for this sale</p>
		)}
		
	</div>
	</div>
	)}
	
      {currentState.step === 2 && (
	  
	  <div className='bs-parent-container two'>
	  
	  	<div>
       		<button onClick={prevStep} className='bs-back-button'> &lt; back</button>
		</div>
		
		<div className='bs-gap-container-two'>
		  		  
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
	  			{currentState.action === 'buy' ? <p>Estimated Cost</p> : <p>Estimated Value</p>}
		  	</div>
			
		  	<div>
		  		<p> ${toCurrency(estimatedCost)} USD </p>
		  	</div>
			
		</div>
		<hr className='bs-line' />		  
		
		
		<form onSubmit={handleSubmit}>
		  	<button type='submit' className='next-two' disabled={isSubmitting}>Submit</button>
		</form>
		
	</div>
	</div>
	)}
	
	{currentState.step === 3 && (
	<div className='bs-parent-container three'>
	
		<div className='bs-success'>
			{error ? <p className='bs-success-text'>Order failed</p> : <p className='bs-success-text'>Order Success</p>}
			<p>Today at {new Date().toLocaleTimeString()}</p>
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
		  		<p>{orderData.quantity}</p>
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
		
	
	</>
	
  );
};

export default BuySell;
