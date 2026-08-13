import { useState } from 'react'

interface Props {
  symbol: string
  size?: number
}

const LOGO_DEV_TOKEN = 'pk_ZBCJebqoQXKBWVLhwcIBfg'

const TickerLogo = ({ symbol, size = 32 }: Props) => {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      src={`https://img.logo.dev/ticker/${symbol}?token=${LOGO_DEV_TOKEN}&retina=true&format=png`}
      className={`ticker-logo ${loaded ? 'loaded' : ''}`}
      height={size}
      width={size}
      alt={`${symbol} logo`}
      onLoad={() => setLoaded(true)}
      onError={(e) => {
        e.currentTarget.src = '/fallback-logo.svg'
        setLoaded(true)
      }}
    />
  )
}

export default TickerLogo
