import {useState, useEffect} from 'react'

const useTransition = (loading:boolean, data:unknown) => {
	
    const [isLoaded, setIsLoaded] = useState(false)
	
	useEffect(() => {
		if (!loading && data) {
			setIsLoaded(true)
		}
	}, [loading, data])
	
	return isLoaded;
}

export default useTransition
	
	
	