import '../../stylesheets/desktop/addwithdraw.css'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { NumericFormat } from 'react-number-format'
import type { NumberFormatValues } from 'react-number-format'
import type { Error } from '../../types.ts'

interface Props {
  getPortfolioData: () => Promise<void>
  getChartData: () => Promise<void>
}

const AddButton = ({ getPortfolioData, getChartData }: Props) => {
  const API: String = import.meta.env.VITE_API
  const token = localStorage.getItem('authToken')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<Error>(null)

  const openDialog = () => setIsOpen(true)
  const closeDialog = () => {
    setIsOpen(false)
    setError(null)
    setAmount('')
  }

  const handleChange = (values: NumberFormatValues) => {
    setAmount(values.value)
  }

  const handleAllowed = (values: NumberFormatValues) => {
    if (values.floatValue === undefined) return true
    return values.formattedValue.length <= 17
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`${API}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authToken: token } as HeadersInit,
        body: JSON.stringify({ amount: amount }),
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
      setError('Unable to process deposit, please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button className="add-withdraw-button" onClick={openDialog}>
        Add Funds
      </button>

      {isOpen &&
        document.body &&
        createPortal(
          <div>
            <div className="background-overlay"></div>

            <div className="modal-dialog">
              <div className="modal-header">
                <h2>Add Funds</h2>
                {error && <div className="insufficient">{error}</div>}
              </div>

              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="modal-amount-container">
                  <div className="modal-amount-container-two">
                    <div className="modal-amount-container-three">
                      <span className="modal-dollar">$</span>
                      <label className="modal-amount-label" htmlFor="amount">
                        Amount
                      </label>
                      <NumericFormat value={amount} onValueChange={handleChange} thousandSeparator={true} decimalScale={2} className="modal-amount-input" allowNegative={false} placeholder="0.00" suffix=" USD" isAllowed={handleAllowed} />
                    </div>
                  </div>
                </div>

                <div className="modal-submit">
                  <button type="submit" className="aw-submit" disabled={isSubmitting}>
                    Submit
                  </button>
                </div>
              </form>

              <button className="close-button" onClick={closeDialog} disabled={isSubmitting}>
                X
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default AddButton
