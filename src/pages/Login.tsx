import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'

interface LoginProps {
  onLogin: (employeeId: string) => void
}

export function Login({ onLogin }: LoginProps) {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!employeeId.trim() || !password.trim()) {
      setMessage('Employee ID and password are required.')
      return
    }

    onLogin(employeeId.trim())
  }

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-stripe" />
        <img
          className="login-logo"
          src="/assets/dop-dak-sewa-jan-sewa-logo.webp"
          alt="India Post Dak Sewa Jan Sewa"
        />
        <p className="login-eyebrow">Department of Posts · India</p>
        <h1 id="login-title">Indore Region Operational Monitoring</h1>
        <p className="login-subtitle">Sign in with your Employee ID to continue.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Employee ID
            <span className="login-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value)
                  setMessage('')
                }}
                placeholder="e.g. USER001"
                autoComplete="username"
              />
            </span>
          </label>

          <label>
            Password
            <span className="login-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setMessage('')
                }}
                autoComplete="current-password"
              />
            </span>
          </label>

          {message ? <div className="login-message" role="alert">{message}</div> : null}

          <button className="login-button" type="submit">Sign in</button>
        </form>

        <p className="login-footnote">Accounts are issued by the administrator.</p>
      </section>
    </main>
  )
}
