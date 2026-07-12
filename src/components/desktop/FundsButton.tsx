import '../../stylesheets/desktop/addwithdraw.css'
import { useState } from 'react'
import { NumericFormat } from 'react-number-format'
import type { NumberFormatValues } from 'react-number-format'
import type { Error } from '../../types.ts'
import apiFetch from '../../apiFetch'

interface Props {
  mode: 'deposit' | 'withdraw'
  getPortfolioData: () => Promise<void>
  getChartData: () => Promise<void>
  balance?: string
}

const FundsButton = ({ mode, getPortfolioData, getChartData, balance }: Props) => {
  const API: string = import.meta.env.VITE_API
  const token = localStorage.getItem('authToken')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<Error>(null)
	const [hasTyped, setHasTyped] = useState(false)

  const insufficient = mode === 'withdraw' && (isNaN(parseFloat(balance as any)) || parseFloat(balance as any) < parseFloat(amount))

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev)
    setError(null)
    setAmount('')
  }

  const handleChange = (values: NumberFormatValues) => {
    setAmount(values.value)
		setHasTyped(true)
  }

  const handleAllowed = (values: NumberFormatValues) => {
    if (values.floatValue === undefined) return true
    return mode === 'deposit'
      ? values.formattedValue.length <= 17
      : values.floatValue <= 1000000000000
  }

  async function handleSubmit() {
		if (!parseFloat(amount)) {
			setError('Please enter an amount')
			setHasTyped(false)
			return
		}
		
    setIsSubmitting(true)
    setHasTyped(false)
		
    try {
      const response = await apiFetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authToken: token } as HeadersInit,
        body: JSON.stringify({ amount: amount }),
      })
			if (!response) return
      if (response.ok) {
        setAmount('')
        getPortfolioData()
        getChartData()
        setIsOpen(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error)
      }
    } catch (error) {
      setError(`Unable to process ${mode === 'deposit' ? 'deposit' : 'withdrawal'}, please try again`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="add-funds-container">
			
      <button className={`add-withdraw-button ${isOpen ? 'active' : ''}`} onClick={toggleDropdown}>
        {mode === 'deposit' ? 'Add Funds' : 'Withdraw Funds'}
      </button>
			
      <div className={`add-funds-dropdown ${isOpen ? 'open' : ''}`}>
				<div className={`af-error-container ${(error && !isSubmitting && !hasTyped) || insufficient ? 'visible' : ''}`}>
					<p>{insufficient ? 'Not enough funds to withdraw' : (error || '\u00A0')}</p>
				</div>
					
        <div className="add-funds-input-row">
          <span className="modal-dollar">$</span>
          <NumericFormat value={amount} onValueChange={handleChange} thousandSeparator={true} decimalScale={2}
            className="modal-amount-input" allowNegative={false} placeholder="0.00" suffix=" USD" isAllowed={handleAllowed}/>
        </div>
        <button type="button" className={`aw-submit ${isSubmitting ? 'submitting' : ''}`} onClick={handleSubmit} disabled={isSubmitting || insufficient}>
          Submit
        </button>
      </div>
    </div>
  )
}

export default FundsButton
