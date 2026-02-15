import { useParams } from 'react-router-dom';

function useEndpoint() {
	
	const params = useParams()
	
	const method = params?.method
	
	const path = params['*']
	
	const endpoint = `${method?.toUpperCase()} /${path}`
	
	return {method, path, endpoint}
	
}

export default useEndpoint;