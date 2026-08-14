import { useState, useEffect } from 'react'
import { toCurrency } from '../lib/utils.ts'
import type { Position } from '../lib/types.ts'
import { NumericFormat } from 'react-number-format'
import '../stylesheets/buysell.css'
import type { NumberFormatValues } from 'react-number-format'
import type { Price, Error } from '../lib/types.ts'
import apiFetch from '../lib/apiFetch'

interface Props {
  getUserData: () => Promise<void>
  balance: string | undefined
  position: Position | undefined
  price: Price
  symbol: string | undefined
}

interface OrderData {
  market_price: string
  quantity: number
  symbol: string
  value: string
}

const BuySell = ({ getUserData, balance, position, price, symbol }: Props) => {

  const [currentState, setCurrentState] = useState({ action: 'buy', step: 1 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error>(null)
  const [quantity, setQuantity] = useState('')
  const [orderData, setOrderData] = useState<null | OrderData>(null)
  const [time, setTime] = useState<null | string>(null)

  const calculateCost = (quantity: string, price: Price) => {
    if (price === null) return 'N/A'
    return (Number(quantity) || 0) * Number(price)
  }

  const estimatedCost = calculateCost(quantity, price)
  const free = estimatedCost === 0 || isNaN(estimatedCost as any)
  const hasInsufficientFunds = isNaN(Number(balance)) || (typeof estimatedCost === 'number' && estimatedCost > Number(balance))
  const hasInsufficientShares = Number(quantity) > (position?.shares || 0)
	const isBuy = currentState.action === 'buy'
	const isSell = currentState.action === 'sell'

  const isQuantityInvalid = () => {
    if (quantity === '') return true
  }

  const quantityInvalid = isQuantityInvalid()

  const handleChange = (values: NumberFormatValues) => {
    setQuantity(values.value)
  }

  const handleAllowed = (values: NumberFormatValues) => {
    if (values.floatValue === undefined) return true
    return values.floatValue <= 100000000000
  }

  const nextStep = () => setCurrentState({ ...currentState, step: currentState.step + 1 })
  const prevStep = () => setCurrentState({ ...currentState, step: currentState.step - 1 })
  const buyState = () => setCurrentState({ action: 'buy', step: 1 })
  const sellState = () => setCurrentState({ action: 'sell', step: 1 })

  const resetState = () => {
    setCurrentState({ action: 'buy', step: 1 })
    setError(null)
    setQuantity('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const action = currentState.action
    try {
      const response = await apiFetch(`/stocks/${symbol}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' } as HeadersInit,
        body: JSON.stringify({ quantity: quantity }),
      })
			if (!response) return
      if (response.ok) {
        const data = await response.json()
        setOrderData(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error)
      }
    } catch (error) {
      setError('Something went wrong, please try again later')
    } finally {
      setIsSubmitting(false)
      getUserData()
      setTime(new Date().toLocaleTimeString())
      nextStep()
    }
  }

  useEffect(() => {
    resetState()
  }, [symbol])

  return (
    <>
      {currentState.step === 1 && (
        <div className="bs-parent-container">
          <div className="bs-button-container">
            <button onClick={buyState} className="buy-sell-button">
              <div className="bs-text-parent">
                <p className={isBuy ? 'buy-sell-text active' : 'buy-sell-text'}>Buy</p>
              </div>
            </button>

            <button onClick={sellState} className="buy-sell-button">
              <div className="bs-text-parent">
                <p className={isSell ? 'buy-sell-text active' : 'buy-sell-text'}>Sell</p>
              </div>
            </button>
          </div>

          <div className="bs-gap-container">
            <div className="bs-containers">
              <div className="bs-width-wrapper">
                <p>Order Type</p>
              </div>

              <div>
                <p>Market {isBuy ? 'Buy' : 'Sell'}</p>
              </div>
            </div>

            <div className="bs-containers">
              <div className="bs-shares-wrapper">
                <label>Shares</label>
              </div>

              <div className="shares-input-form">
                <NumericFormat value={quantity} onValueChange={handleChange} thousandSeparator={true} decimalScale={0} className="shares-input" allowNegative={false} placeholder="0" isAllowed={handleAllowed} />
              </div>
            </div>

            <div className="bs-containers">
              <div className="bs-width-wrapper">
                <p>Estimated {isBuy ? 'Cost' : 'Value'}</p>
              </div>

              <div>
                <p>{price === null ? '$0.00 USD' : `$${toCurrency(estimatedCost)} USD`}</p>
              </div>
            </div>

            <div className="bs-next-parent">
							<button className="btn btn-primary next" onClick={nextStep}
							disabled={(isBuy ? hasInsufficientFunds : hasInsufficientShares) || quantityInvalid || free}>
							  Next
							</button>

              <hr className="bs-line" />

              <div className="bs-containers">
                <div className="bs-width-wrapper">
                  <p>Available {isBuy ? 'Cash' : 'Shares'}</p>
                </div>

                <div>{isBuy ? <p className="est-cost"> ${toCurrency(balance)} USD </p> : <p>{position?.shares?.toLocaleString() || 0}</p>}</div>
              </div>
            </div>
						
						<div className={`bs-error-container ${(isBuy && hasInsufficientFunds) || (isSell && hasInsufficientShares) ? 'visible' : '' }`}>
						  <p>{(isBuy && hasInsufficientFunds) ? 'Insufficient funds for this purchase' : (isSell && hasInsufficientShares) ? 'Insufficient shares for this sale' : '\u00A0'}</p>
						</div>
          </div>
        </div>
      )}

      {currentState.step === 2 && (
        <div className="bs-parent-container two">
          <div>
            <button onClick={prevStep} className="bs-back-button">
              <p className="back-arrow">←</p>
              <p>&nbsp;back</p>
            </button>
          </div>

          <div className="bs-gap-container">
            <div className="bs-containers">
              <div className="bs-width-wrapper">
                <p>Order</p>
              </div>

              <div>
                <p>Market {isBuy ? 'Buy' : 'Sell'} {symbol}</p>
              </div>
            </div>

            <div className="bs-containers">
              <div className="bs-width-wrapper">
                <p>Shares</p>
              </div>

              <div>
                <p>{parseFloat(quantity).toLocaleString()}</p>
              </div>
            </div>

            <div className="bs-containers">
              <div className="bs-width-wrapper">
                <p>Estimated {isBuy ? 'Cost' : 'Value'}</p>
              </div>

              <div>
                <p> ${toCurrency(estimatedCost)} USD </p>
              </div>
            </div>
            <hr className="bs-line" />

            <form onSubmit={handleSubmit}>
              <button type="submit" className={`btn btn-primary next ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting || (isBuy && hasInsufficientFunds) || (isSell && hasInsufficientShares)}>
                Submit
              </button>
            </form>

						<div className={`bs-error-container ${(isBuy && hasInsufficientFunds) || (isSell && hasInsufficientShares) ? 'visible' : '' }`}>
						  <p>{(isBuy && hasInsufficientFunds) ? 'Insufficient funds for this purchase' : (isSell && hasInsufficientShares) ? 'Insufficient shares for this sale' : '\u00A0'}</p>
						</div>
          </div>
        </div>
      )}

      {currentState.step === 3 && !isSubmitting && orderData && (
        <div className="bs-parent-container">
          <div className="bs-success">
            <p className="bs-success-text">Order Success</p>
            <p>Today at {time}</p>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Order</p>
            </div>

            <div>
              <p>Market {isBuy ? 'Buy' : 'Sell'} {orderData.symbol}</p>
            </div>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>{isBuy ? 'Cost' : 'Value'}</p>
            </div>

            <div>
              <p> ${toCurrency(orderData.value)} USD </p>
            </div>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Shares</p>
            </div>

            <div>
              <p>{orderData.quantity.toLocaleString()}</p>
            </div>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Price Per Share</p>
            </div>

            <div>
              <p> ${toCurrency(orderData.market_price)} USD </p>
            </div>
          </div>

          <hr className="bs-line" />

          <div>
            <button className="btn btn-primary next" onClick={resetState}>
              Done
            </button>
          </div>
        </div>
      )}

      {currentState.step === 3 && !isSubmitting && error && (
        <div className="bs-parent-container three">
          <div className="bs-success">
            <p className="bs-success-text">Order Failed</p>
            <p>Today at {time}</p>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Order</p>
            </div>

            <div>
              <p>Market {isBuy ? 'Buy' : 'Sell'} {symbol}</p>
            </div>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Shares</p>
            </div>

            <div>
              <p>{quantity}</p>
            </div>
          </div>

          <div className="bs-containers">
            <div className="bs-width-wrapper">
              <p>Message</p>
            </div>

            <div className="bs-width-wrapper">
              <p> {error} </p>
            </div>
          </div>

          <div>
            <button className="btn btn-primary next" onClick={resetState}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default BuySell
