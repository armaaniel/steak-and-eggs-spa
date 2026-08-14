import '../stylesheets/welcome.css'
import useTryDemo from '../hooks/useTryDemo'

function Welcome() {
  const { tryDemo, isSubmitting, error } = useTryDemo()

  return (
    <>
      <div className="welcome-main-desktop">
        <h1 className="welcome-heading-desktop"> The best place to paper trade </h1>

        <div className="welcome-start-desktop">
          <button className="btn btn-primary welcome-cta" disabled={isSubmitting} onClick={tryDemo}>
            Try Demo
          </button>
          <div className={`welcome-error ${error && !isSubmitting ? 'visible' : 'hidden'}`}>
            <p className="ls-heading error">{error}</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Welcome
