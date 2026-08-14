import { Link } from 'react-router-dom'
import { toCurrency, toPercent, toPnlCurrency } from '../lib/utils.ts'
import '../stylesheets/positionstable.css'
import type { Positions, Prices, Error } from '../lib/types.ts'
import TickerLogo from './TickerLogo'

interface Props {
  positions?: Positions[]
  prices: Prices
  error: Error
}

const PositionsTable = ({ positions, prices, error }: Props) => {
  return (
    <table className="portfolio">
      <thead>
        <tr className="heading-row">
          <th className="quantity-header-one">Positions</th>
          <th className="quantity-header-one">Total Value</th>
          <th className="quantity-header-one">Average Price</th>
          <th className="quantity-header-one">Current Price</th>
          <th className="quantity-header-one">Unrealized PnL</th>
        </tr>
      </thead>

      {!positions && !error && (
        <tbody>
          <tr className="positions-state-row">
            <td className="shares-cell" colSpan={5}>
              <p>No positions yet</p>
            </td>
          </tr>
        </tbody>
      )}

      {!positions && error && (
        <tbody>
          <tr className="positions-state-row">
            <td className="shares-cell" colSpan={5}>
              <p>{error}</p>
            </td>
          </tr>
        </tbody>
      )}

      <tbody>
        {positions?.map((position) => {
          const price = prices[position.symbol] || position.price
          const percentChange = toPercent(price, position.open)
          const changeIsPositive = Boolean(percentChange && percentChange.startsWith('+'))
          const pnlChange = toPercent(price, position.average_price)
          const pnlIsPositive = Boolean(pnlChange && pnlChange.startsWith('+'))

          return (
            <tr key={position.symbol} className="portfolio-row-two loaded">
              <td className="shares-cell">
                <Link to={`/stocks/${position.symbol}`} className="symbol-name">
                  <TickerLogo symbol={position.symbol} />
                  <div className="stock-text">
                    <p className="stock-symbol">{position.symbol}</p>
                    <p className="stock-name">{position.name}</p>
                  </div>
                </Link>
              </td>

              <td className="shares-cell">
                <Link to={`/stocks/${position.symbol}`} className="symbol-name">
                  <div className="stock-text">
                    <p className="stock-symbol">${toCurrency(price * position.shares)} </p>
                    <p className="stock-shares">
                      {position.shares} shares
                    </p>
                  </div>
                </Link>
              </td>

              <td className="shares-cell">
                <Link to={`/stocks/${position.symbol}`} className="symbol-name">
                  <div className="stock-text">
                    <p className="stock-name">${toCurrency(position.average_price)}</p>
                  </div>
                </Link>
              </td>

              <td className="shares-cell">
                <Link to={`/stocks/${position.symbol}`} className="symbol-name">
                  <div className="stock-text">
                    <p className="stock-name">${toCurrency(price)}</p>
                    <p className={`stock-name ${changeIsPositive ? 'positive' : 'negative'}`}>{percentChange}</p>
                  </div>
                </Link>
              </td>

              <td className="shares-cell">
                <Link to={`/stocks/${position.symbol}`} className="symbol-name">
                  <div className="stock-text">
                    <p className="stock-name">${toPnlCurrency((price - parseFloat(position.average_price)) * position.shares)}</p>
                    <p className={`stock-name ${pnlIsPositive ? 'positive' : 'negative'}`}>{pnlChange}</p>
                  </div>
                </Link>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default PositionsTable
