import React, { useState, useEffect } from 'react';
import { toCurrency }  from '../../utils.js'
import '../../stylesheets/desktop/positionstable.css'


const PositionTable = ({ position, price }) => {
	
	const unrealizedPnL = (price-position.average_price)*position.shares;
 
 return (
     <table className="portfolio">
	 
       <thead>
         <tr className="heading-row">
           <th className="quantity-header">Total Value</th>
           <th className="quantity-header">Average Price</th>
           <th className="quantity-header">Unrealized PnL</th>	   
         </tr>
       </thead>
       
       <tbody>
           <tr key={position.symbol} className="portfolio-row">
             
             <td className="shares-cell">
             	<div className="symbol-name">
                <img src={`https://img.logo.dev/ticker/${position.symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true&format=png`} height="32" width="32"
			 onError={(e) => {e.target.src = '/fallback-logo.svg'}}/>
                 <div className='stock-text'>
                 	<p className='stock-symbol'>${toCurrency(price * position.shares)} </p>
                   <p key={position.shares} className='stock-shares'>{position.shares} shares</p>
                 </div>
				 
               </div>
             </td>
			 
             <td className="shares-cell">
               <div className="symbol-name">
			   
                 <div className='stock-text'>
				 	<p className='stock-name'>${toCurrency(position.average_price)}</p>
                 </div>
				 
               </div>
             </td>
			 
             <td className="shares-cell">
             	<div className="symbol-name">
			   
                 <div className='stock-text'>
				 	<p className='stock-name'>${toCurrency(unrealizedPnL)}</p>
                 </div>
				 
               </div>
             </td>
			 		 
           </tr>
       </tbody>
     </table>
 );
};

export default PositionTable;