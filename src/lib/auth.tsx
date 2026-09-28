import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthValue {
  token: string | null
  setToken: (token: string | null) => void
}

const AuthContext = createContext<AuthValue>({ token: null, setToken: () => {} })

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'))

  useEffect(() => {
    const syncToken = (e: StorageEvent) => {
      if (e.key !== 'authToken' && e.key !== null) return
      setToken(localStorage.getItem('authToken'))
    }

    window.addEventListener('storage', syncToken)
    return () => window.removeEventListener('storage', syncToken)
  }, [])

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
