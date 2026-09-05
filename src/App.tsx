import { useEffect, useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'

const AUTH_KEY = 'irm-authenticated'
const USER_KEY = 'irm-user-id'

function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_KEY) ?? '')
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === 'true')

  useEffect(() => {
    document.title = isAuthenticated
      ? 'Indore Region Operational Monitoring | India Post'
      : 'Sign in | Indore Region Operational Monitoring'
  }, [isAuthenticated])

  function handleLogin(nextUserId: string) {
    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(USER_KEY, nextUserId)
    setUserId(nextUserId)
    setIsAuthenticated(true)
  }

  function handleSignOut() {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(USER_KEY)
    setUserId('')
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard userId={userId || '10087118'} onSignOut={handleSignOut} />
}

export default App
