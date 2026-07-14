interface Props {
  symbol: string
  size?: number
  onLoad?: () => void
  onError?: () => void
}

const LOGO_DEV_TOKEN = 'pk_ZBCJebqoQXKBWVLhwcIBfg'

const TickerLogo = ({ symbol, size = 32, onLoad, onError }: Props) => {
  return (
    <img
      src={`https://img.logo.dev/ticker/${symbol}?token=${LOGO_DEV_TOKEN}&retina=true&format=png`}
      height={size}
      width={size}
      onLoad={onLoad}
      onError={(e) => {
        e.currentTarget.src = '/fallback-logo.svg'
        onError?.()
      }}
    />
  )
}

export default TickerLogo
