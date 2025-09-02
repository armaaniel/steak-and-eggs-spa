import { useState, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { Link } from 'react-router-dom'
import '../../stylesheets/desktop/searchbar.css'

const Searchbar = () => {
	
    const API = import.meta.env.VITE_API

    const [searchTerm, setSearchTerm] = useState('');

    const [debouncedSearchTerm] = useDebounce(searchTerm, 150)
	
    const [searchResults, setSearchResults] = useState([]);
	
    const [showResults, setShowResults] = useState(false);
	
	const [error, setError] = useState(null)
	
	const searchRef = useRef(null)
	
    const handleChange = (e) => setSearchTerm(e.target.value)

    const handleSelect = () => setSearchTerm('')
	
	const token = localStorage.getItem('authToken')
	
	useEffect(() => {
		const handleClick = (event) => {
			if (searchRef.current && !searchRef.current.contains(event.target)) {
				setShowResults(false)
			}
		}
			
			document.addEventListener('mousedown', handleClick)
			
			return () => {
				document.removeEventListener('mousedown', handleClick)
			}
		}, [])

	useEffect(() => { 
	  if (debouncedSearchTerm) {
	    async function searchStocks() {
			setError(null)
	      try {
			  const response = await fetch(`${API}/search?q=${debouncedSearchTerm}`, {
				headers: {'authToken': token}
			})
			
			if (!response.ok) {
				if (response.status === 401) {
				    localStorage.removeItem('authToken')
				    window.location.href = '/login'
				    return null
				}
				throw new Error(`${response.status}`)
			}
					
	        const data = await response.json()
	        setSearchResults(data)
	        setShowResults(true);
	
	      } catch (error) {
			setError("Something went wrong, please try again later")
			setSearchResults([])
  	        setShowResults(true);
	      }
	    }
	    searchStocks();
	  } else {
	    setSearchResults([]);
	    setShowResults(false);
		setError(null)
	  }
	}, [debouncedSearchTerm]);

    return (
	
	<div className='nav-search-div'>
    	<div className='nav-search-div-two'>
    		<div className='search-svg-div'>
			
    		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20">
			<path d="m14 14-2.867-2.867m1.534-3.8A5.333 5.333 0 1 1 2 7.333a5.333 5.333 0 0 1 10.667 0Z" 
		  	stroke="#32302F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          	</path>
       	 	</svg>
			
    		</div>

    		<div className='search-input-container'>
    			<input type='search' className='search-input' placeholder=" " value={searchTerm} onChange={handleChange} />
				<label htmlFor='search' className='search-label'>Search name or symbol</label>
  		  	</div>
			
		</div>
  		
		{debouncedSearchTerm && showResults && (
			<div className="search-results-container" ref={searchRef}>
			<ul className="search-results">

			{searchResults.map((stock) => (
				<li key={stock.id} className="search-result-item" onClick={handleSelect}>
				
				<Link to={`/stocks/${stock.symbol}`} className='search-link-text' onClick={handleSelect}>
					<div>{stock.symbol}</div>
					<div>{stock.name}</div>
                </Link>
				
				</li>
			))}
			</ul>
			
		{searchResults.length === 0 && !error && showResults && (
			<div className="no-search-result">
				No stocks found
			</div>
		)}
		
		{error && (
			<div className="no-search-result">
				{error}
			</div>
		)}
			
			</div>
		)}
		
	</div>
	
	);
};

export default Searchbar;