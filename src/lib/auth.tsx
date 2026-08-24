import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthValue {
  token: string | null
  setToken: (token: string | null) => void
}

const AuthContext = createContext<AuthValue>({ token: null, setToken: () => {} })

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'))

  /* setToken only reaches the tab that called it, and this initialiser runs once, so a
     second tab keeps its stale token forever. The storage event fires in every OTHER
     tab on the origin whenever localStorage changes, so mirror the token back into
     state there — otherwise logging in (or out) in one tab leaves the rest showing the
     wrong nav and the login form. A null key means localStorage.clear(). */
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
