import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import { toCurrency }  from '../../utils.js'
import '../../stylesheets/desktop/positionstable.css'


const PositionsTable = ({ positions }) => {	
 
 return (
     <table className="portfolio">
       <thead>
         <tr className="heading-row">
           <th className="positions-header">Positions</th>
           <th className="quantity-header">Total Value</th>
           <th className="quantity-header">Today's Price</th>
           <th className="quantity-header">Average Price</th>
           <th className="quantity-header">Unrealized PnL</th>
		   
		   
         </tr>
       </thead>
       
       <tbody>
         {positions?.map((position) => (
           <tr key={position.symbol} className="portfolio-row">
             
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <img src={`https://img.logo.dev/ticker/${position.symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true&format=png`} height="32" width="32"
				 onError={(e) => {e.target.src = '/fallback-logo.svg'}}/>
                 <div className="stock-text">
                   <p className="stock-symbol">{position.symbol}</p>
                   <p className="stock-name">{position.name}</p>
                 </div>
				 
               </Link>
             </td>
             
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
                   <p className='stock-symbol'>${toCurrency(position.price * position.shares)} </p>
                   <p key={position.shares} className='stock-shares'>{position.shares} shares</p>
                 </div>
				 
               </Link>
             </td>
             
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
				 <p className='stock-name'>${toCurrency(position.price)}</p>
                 </div>
				 
               </Link>
             </td>
			 
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
				 <p className='stock-name'>${toCurrency(position.average_price)}</p>
                 </div>
				 
               </Link>
             </td>
			 
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
				 <p className='stock-name'>${toCurrency((position.price-position.average_price)*position.shares)}</p>
                 </div>
				 
               </Link>
             </td>
			 
			 
             
           </tr>
         ))}
       </tbody>
     </table>
 );
};

export default PositionsTable;