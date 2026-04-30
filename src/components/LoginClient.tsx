'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function LoginClient({
  registrationMode,
}: {
  registrationMode: 'OPEN' | 'INVITE' | 'CLOSED'
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '登录失败')
      }

      window.location.href = '/'
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">骂了么</p>
        <h1>先登录，再清醒。</h1>
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>邮箱</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span>密码</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? '登录中' : '登录'}
          </button>
        </form>
        {registrationMode !== 'CLOSED' ? (
          <p className="auth-switch">
            还没有账号？ <Link href="/register">去注册</Link>
          </p>
        ) : null}
      </section>
    </main>
  )
}
