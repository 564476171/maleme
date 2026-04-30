'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function RegisterClient({
  registrationMode,
}: {
  registrationMode: 'OPEN' | 'INVITE' | 'CLOSED'
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          inviteCode: inviteCode || undefined,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '注册失败')
      }

      window.location.href = '/'
    } catch (error) {
      setError(error instanceof Error ? error.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">骂了么</p>
        <h1>注册一个清醒账号。</h1>
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
              autoComplete="new-password"
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {registrationMode === 'INVITE' ? (
            <label>
              <span>邀请码</span>
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
              />
            </label>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? '注册中' : '注册'}
          </button>
        </form>
        <p className="auth-switch">
          已经有账号？ <Link href="/login">去登录</Link>
        </p>
      </section>
    </main>
  )
}
