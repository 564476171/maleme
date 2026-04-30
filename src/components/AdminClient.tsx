'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { type AppUser, type ProviderSummary } from '@/lib/content'

type AdminUser = {
  id: string
  email: string
  role: 'USER' | 'VIP' | 'ADMIN'
  disabled: boolean
  createdAt: string
  _count: {
    checkIns: number
    aiReflections: number
  }
}

type Invite = {
  id: string
  code: string
  role: 'USER' | 'VIP' | 'ADMIN'
  maxUses: number
  usedCount: number
  disabled: boolean
}

type Brother = {
  id: string
  name: string
  mbti: string | null
  description: string
  catchphrase: string | null
  enabled: boolean
  sortOrder: number
}

type ContentItem = {
  id: string
  type: 'DAILY_ROAST' | 'DAILY_TASK'
  content: string
  enabled: boolean
  sortOrder: number
}

type RecordItem = {
  id: string
  userId: string | null
  mode?: string
  input?: string
  dateKey?: string
  score?: number
  level?: string
  createdAt: string
  user?: { email: string } | null
}

type Overview = {
  users: AdminUser[]
  registrationMode: 'OPEN' | 'INVITE' | 'CLOSED'
  invites: Invite[]
  adminProvider: ProviderSummary
  brothers: Brother[]
  content: ContentItem[]
  checkIns: RecordItem[]
  reflections: RecordItem[]
}

const emptyProvider = { url: '', apiKey: '', model: '' }
const emptyBrotherDraft = {
  id: '',
  name: '',
  mbti: '',
  description: '',
  catchphrase: '',
  enabled: true,
  sortOrder: 0,
}

export default function AdminClient({ currentUser }: { currentUser: AppUser }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState(emptyProvider)
  const [adminModels, setAdminModels] = useState<string[]>([])
  const [isLoadingAdminModels, setIsLoadingAdminModels] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteRole, setInviteRole] = useState<'USER' | 'VIP'>('USER')
  const [contentDraft, setContentDraft] = useState({
    type: 'DAILY_ROAST' as 'DAILY_ROAST' | 'DAILY_TASK',
    content: '',
  })
  const [brotherDraft, setBrotherDraft] = useState(emptyBrotherDraft)

  async function fetchOverview() {
    const response = await fetch('/api/admin/overview')
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.error ?? '后台数据加载失败')
    }

    return payload as Overview
  }

  async function loadOverview() {
    const payload = await fetchOverview()
    setOverview(payload)
    setProvider({
      url: payload.adminProvider?.baseUrl ?? '',
      apiKey: '',
      model: payload.adminProvider?.model ?? '',
    })
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialOverview() {
      try {
        const payload = await fetchOverview()
        if (!ignore) {
          setOverview(payload)
          setProvider({
            url: payload.adminProvider?.baseUrl ?? '',
            apiKey: '',
            model: payload.adminProvider?.model ?? '',
          })
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '后台数据加载失败')
        }
      }
    }

    void loadInitialOverview()

    return () => {
      ignore = true
    }
  }, [])

  async function runAction(action: () => Promise<void>, success: string) {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await action()
      setMessage(success)
      await loadOverview()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function patchJson(url: string, body: unknown, method = 'PATCH') {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error ?? '请求失败')
    }
  }

  async function saveAdminProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      () => patchJson('/api/admin/provider', provider, 'POST'),
      '管理员模型已保存。',
    )
  }

  async function loadAdminModels() {
    setIsLoadingAdminModels(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: provider.url,
          apiKey: provider.apiKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '模型列表获取失败')
      }

      setAdminModels(payload.models ?? [])
      setMessage('模型列表已获取，也可以继续手动填写。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '模型列表获取失败')
    } finally {
      setIsLoadingAdminModels(false)
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      () =>
        patchJson(
          '/api/admin/invites',
          { code: inviteCode, role: inviteRole, maxUses: 1 },
          'POST',
        ),
      '邀请码已创建。',
    )
    setInviteCode('')
  }

  async function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      () =>
        patchJson(
          '/api/admin/content',
          { ...contentDraft, enabled: true, sortOrder: overview?.content.length ?? 0 },
          'POST',
        ),
      '内容已新增。',
    )
    setContentDraft({ type: 'DAILY_ROAST', content: '' })
  }

  async function saveBrother(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      () => patchJson('/api/admin/brothers', brotherDraft, 'POST'),
      '兄弟人设已保存。',
    )
    setBrotherDraft(emptyBrotherDraft)
  }

  function editBrother(brother: Brother) {
    setBrotherDraft({
      id: brother.id,
      name: brother.name,
      mbti: brother.mbti ?? '',
      description: brother.description,
      catchphrase: brother.catchphrase ?? '',
      enabled: brother.enabled,
      sortOrder: brother.sortOrder,
    })
  }

  return (
    <main className="app-shell admin-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">管</span>
          <span>
            管理后台
            <small>{currentUser.email}</small>
          </span>
        </Link>
        <Link className="ghost-link" href="/">
          返回首页
        </Link>
      </header>

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      {!overview ? <p className="muted">加载中...</p> : null}

      {overview ? (
        <section className="admin-grid">
          <section className="panel">
            <h2>注册策略</h2>
            <div className="button-row">
              {(['OPEN', 'INVITE', 'CLOSED'] as const).map((mode) => (
                <button
                  className={
                    overview.registrationMode === mode
                      ? 'secondary-button active'
                      : 'secondary-button'
                  }
                  disabled={loading}
                  key={mode}
                  type="button"
                  onClick={() =>
                    runAction(
                      () =>
                        patchJson('/api/admin/settings', {
                          registrationMode: mode,
                        }),
                      '注册策略已更新。',
                    )
                  }
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>管理员模型</h2>
            <form className="settings-form" onSubmit={saveAdminProvider}>
              <label>
                <span>URL</span>
                <input
                  value={provider.url}
                  onChange={(event) =>
                    setProvider((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>API Key</span>
                <input
                  placeholder={
                    overview.adminProvider.apiKeyHint
                      ? `已保存 ${overview.adminProvider.apiKeyHint}，留空不修改`
                      : 'sk-...'
                  }
                  type="password"
                  value={provider.apiKey}
                  onChange={(event) =>
                    setProvider((current) => ({
                      ...current,
                      apiKey: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Model</span>
                <input
                  list="admin-model-options"
                  value={provider.model}
                  onChange={(event) =>
                    setProvider((current) => ({
                      ...current,
                      model: event.target.value,
                    }))
                  }
                />
                <datalist id="admin-model-options">
                  {adminModels.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </label>
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  disabled={isLoadingAdminModels || !provider.url}
                  type="button"
                  onClick={loadAdminModels}
                >
                  {isLoadingAdminModels ? (
                    <RefreshCw size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  获取模型
                </button>
                <button className="primary-button compact" type="submit">
                  保存管理员模型
                </button>
              </div>
            </form>
          </section>

          <section className="panel wide-panel">
            <h2>用户管理</h2>
            <div className="admin-table">
              {overview.users.map((user) => (
                <div className="admin-row" key={user.id}>
                  <span>{user.email}</span>
                  <select
                    disabled={loading || user.id === currentUser.id}
                    value={user.role}
                    onChange={(event) =>
                      runAction(
                        () =>
                          patchJson('/api/admin/users', {
                            userId: user.id,
                            role: event.target.value,
                          }),
                        '用户角色已更新。',
                      )
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="VIP">VIP</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <em>{user._count.checkIns} 打卡 / {user._count.aiReflections} AI</em>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`清空 ${user.email} 的打卡和 AI 记录？`)) {
                        return
                      }

                      void runAction(
                        () =>
                          patchJson(
                            '/api/admin/records',
                            { type: 'userRecords', userId: user.id },
                            'DELETE',
                          ),
                        '用户记录已清空。',
                      )
                    }}
                  >
                    清空记录
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      const password = window.prompt('输入新密码，至少 8 位')
                      if (!password) return
                      void runAction(
                        () =>
                          patchJson('/api/admin/users', {
                            userId: user.id,
                            password,
                          }),
                        '密码已重置。',
                      )
                    }}
                  >
                    重置密码
                  </button>
                  <button
                    className="secondary-button"
                    disabled={user.id === currentUser.id}
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson('/api/admin/users', {
                            userId: user.id,
                            disabled: !user.disabled,
                          }),
                        '用户状态已更新。',
                      )
                    }
                  >
                    {user.disabled ? '启用' : '禁用'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>邀请码</h2>
            <form className="settings-form" onSubmit={createInvite}>
              <label>
                <span>邀请码</span>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </label>
              <label>
                <span>角色</span>
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as 'USER' | 'VIP')
                  }
                >
                  <option value="USER">USER</option>
                  <option value="VIP">VIP</option>
                </select>
              </label>
              <button className="primary-button compact" type="submit">
                创建邀请码
              </button>
            </form>
            <div className="mini-list">
              {overview.invites.map((invite) => (
                <div key={invite.id}>
                  <strong>{invite.code}</strong>
                  <span>
                    {invite.role} {invite.usedCount}/{invite.maxUses}
                    {invite.disabled ? ' / 已停用' : ''}
                  </span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson('/api/admin/invites', {
                            id: invite.id,
                            disabled: !invite.disabled,
                          }),
                        '邀请码状态已更新。',
                      )
                    }
                  >
                    {invite.disabled ? '启用' : '停用'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>内容管理</h2>
            <form className="settings-form" onSubmit={createContent}>
              <label>
                <span>类型</span>
                <select
                  value={contentDraft.type}
                  onChange={(event) =>
                    setContentDraft((current) => ({
                      ...current,
                      type: event.target.value as 'DAILY_ROAST' | 'DAILY_TASK',
                    }))
                  }
                >
                  <option value="DAILY_ROAST">每日一骂</option>
                  <option value="DAILY_TASK">戒断任务</option>
                </select>
              </label>
              <label>
                <span>内容</span>
                <textarea
                  value={contentDraft.content}
                  onChange={(event) =>
                    setContentDraft((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                />
              </label>
              <button className="primary-button compact" type="submit">
                新增内容
              </button>
            </form>
            <div className="mini-list">
              {overview.content.map((item) => (
                <div key={item.id}>
                  <strong>{item.type}{item.enabled ? '' : ' / 已停用'}</strong>
                  <span>{item.content}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson(
                            '/api/admin/content',
                            { ...item, enabled: !item.enabled },
                            'POST',
                          ),
                        '内容状态已更新。',
                      )
                    }
                  >
                    {item.enabled ? '停用' : '启用'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson(
                            '/api/admin/content',
                            { id: item.id },
                            'DELETE',
                          ),
                        '内容已删除。',
                      )
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>兄弟人设</h2>
            <form className="settings-form brother-form" onSubmit={saveBrother}>
              <label>
                <span>ID</span>
                <input
                  placeholder="J / L / W"
                  value={brotherDraft.id}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      id: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>名字</span>
                <input
                  value={brotherDraft.name}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>MBTI</span>
                <input
                  value={brotherDraft.mbti}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      mbti: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>排序</span>
                <input
                  min={0}
                  type="number"
                  value={brotherDraft.sortOrder}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                <span>人设描述</span>
                <textarea
                  value={brotherDraft.description}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>口头禅</span>
                <input
                  value={brotherDraft.catchphrase}
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      catchphrase: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="inline-check">
                <input
                  checked={brotherDraft.enabled}
                  type="checkbox"
                  onChange={(event) =>
                    setBrotherDraft((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
                <span>启用</span>
              </label>
              <div className="settings-actions">
                <button className="primary-button compact" type="submit">
                  保存兄弟
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setBrotherDraft(emptyBrotherDraft)}
                >
                  清空
                </button>
              </div>
            </form>
            <div className="admin-table">
              {overview.brothers.map((brother) => (
                <div className="admin-row" key={brother.id}>
                  <span>{brother.name}</span>
                  <strong>{brother.mbti ?? '-'}</strong>
                  <em>
                    {brother.description}
                    {brother.enabled ? '' : ' / 已停用'}
                  </em>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => editBrother(brother)}
                  >
                    编辑
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson(
                            '/api/admin/brothers',
                            { ...brother, enabled: !brother.enabled },
                            'POST',
                          ),
                        '兄弟启用状态已更新。',
                      )
                    }
                  >
                    {brother.enabled ? '停用' : '启用'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>记录管理</h2>
            <div className="admin-table">
              {overview.reflections.slice(0, 20).map((item) => (
                <div className="admin-row" key={item.id}>
                  <span>{item.user?.email ?? '旧记录'}</span>
                  <strong>{item.mode}</strong>
                  <em>{item.input}</em>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          patchJson(
                            '/api/admin/records',
                            { type: 'aiReflection', id: item.id },
                            'DELETE',
                          ),
                        'AI 记录已删除。',
                      )
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel status-panel">
            <ShieldCheck size={32} />
            <h2>后台状态</h2>
            <p>用户、VIP、邀请码、模型、内容和记录都已接入数据库。</p>
            <button
              className="secondary-button"
              disabled={loading}
              type="button"
              onClick={() => loadOverview()}
            >
              <RefreshCw size={16} />
              刷新
            </button>
          </section>
        </section>
      ) : null}
    </main>
  )
}
