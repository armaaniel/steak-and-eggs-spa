interface Props {
  className?: string
}

const Logo = ({ className }: Props) => {
  const classes = className ? `logo-desktop ${className}` : 'logo-desktop'

  return (
    <svg viewBox="82 16 186 152" xmlns="http://www.w3.org/2000/svg" className={classes} aria-label="Steak & Eggs logo">
      <path d="m122 82c-20-10 40-30 120 0 30 20 20 60-10 70-70 20-130 0-140-30-10-20 10-30 30-40" fill="#8b4513" stroke="#654321" strokeWidth="3" />
      <g stroke="#472400" strokeWidth="3">
        <path d="m142 92 60 10" />
        <path d="m162 112 60 10" />
        <path d="m152 132 60 10" />
      </g>
      <circle cx="142" cy="62" r="35" fill="#fff" stroke="#e6e6e6" strokeWidth="2" />
      <circle cx="142" cy="62" r="12" fill="#ffd700" />
      <circle cx="232" cy="52" r="30" fill="#fff" stroke="#e6e6e6" strokeWidth="2" />
      <circle cx="232" cy="52" r="10" fill="#ffd700" />
    </svg>
  )
}

export default Logo
