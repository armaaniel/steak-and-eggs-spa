import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import '../../stylesheets/desktop/positionstable.css'


const PositionsTable = ({ positions }) => {
 
 return (
     <table className="portfolio">
       <thead>
         <tr className="heading-row">
           <th className="positions-header">Positions</th>
           <th className="quantity-header">Total Value</th>
           <th className="quantity-header">Today's Price</th>
         </tr>
       </thead>
       
       <tbody>
         {positions?.map((position) => (
           <tr key={position.symbol} className="portfolio-row">
             
             <td className="symbol-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <img src={`https://img.logo.dev/ticker/${position.symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true`} height="32" width="32"/>
                 <div className="stock-text">
                   <p className="stock-symbol">{position.symbol}</p>
                   <p className="stock-name">{position.name}</p>
                 </div>
				 
               </Link>
             </td>
             
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
                   {/* <p className='stock-symbol'>${(position.price * position.shares).toFixed(2)} </p> */}
                   <p key={position.shares} className='stock-name'>{position.shares} shares</p>
                 </div>
				 
               </Link>
             </td>
             
             <td className="shares-cell">
               <Link to={`/stocks/${position.symbol}`} className="symbol-name">
			   
                 <div className='stock-text'>
			 {/*  <p className='stock-name'>${position.price.toFixed(2)}</p> */}
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