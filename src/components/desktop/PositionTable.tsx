import { toCurrency, toPercent }  from '../../utils.ts'
import '../../stylesheets/desktop/positionstable.css'
import type { Price, Position }  from '../../types.ts'

interface Props {
	price: Price
	position: Position
}

const PositionTable = ({ position, price }:Props) => {
	
	const value = (parseFloat(price as any) * Number(position.shares))
	
	const pnl = (parseFloat(price as any) - parseFloat(position.average_price)) * Number(position.shares)
	
 	const pnlChange = toPercent(price, position.average_price)
 	const pnlIsPositive = Boolean(pnlChange && pnlChange.startsWith('+'));
 
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
			 onError={(e) => {(e.target as HTMLImageElement).src = '/fallback-logo.svg'}}/>
                 <div className='stock-text'>
                 	<p className='stock-symbol'>${toCurrency(value)} </p>
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
				 	<p className='stock-name'>${toCurrency(pnl)}</p>
   				 	<p className={`stock-name ${pnlIsPositive ? 'positive' : 'negative'}`}>{toPercent(price, position.average_price)}</p>
                 </div>
				 
               </div>
             </td>
			 		 
           </tr>
       </tbody>
     </table>
 );
};

export default PositionTable;