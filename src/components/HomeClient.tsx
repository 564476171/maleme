'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Brain,
  KeyRound,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  AI_MODES,
  CHECKIN_QUESTIONS,
  DEFAULT_BROTHERS,
  getDailyRoast,
  getDailyTask,
  type AiMode,
  type AiResult,
  type AppState,
  type AppUser,
  type BrotherPersona,
  type ProviderSummary,
} from '@/lib/content'

type CheckInRecord = {
  id: string
  dateKey: string
  answers: Record<string, boolean>
  score: number
  level: string
  createdAt: string
  updatedAt: string
}

type Stats = {
  today: CheckInRecord | null
  consecutiveClearDays: number
  relapseCount: number
  history: CheckInRecord[]
  dailyContent: {
    dailyRoast: string
    dailyTask: string
  }
  brothers: BrotherPersona[]
  appState: AppState
}

type CheckInResponse = {
  summary: {
    score: number
    level: string
    advice: string
  }
}

type ProviderForm = {
  url: string
  apiKey: string
  model: string
}

const emptyProviderForm: ProviderForm = {
  url: '',
  apiKey: '',
  model: '',
}

function createEmptyAnswers() {
  return Object.fromEntries(
    CHECKIN_QUESTIONS.map((question) => [question.id, false]),
  ) as Record<string, boolean>
}

function providerFormFromSummary(provider?: ProviderSummary): ProviderForm {
  return {
    url: provider?.baseUrl ?? '',
    apiKey: '',
    model: provider?.model ?? '',
  }
}

export default function HomeClient({ initialUser }: { initialUser: AppUser }) {
  const [answers, setAnswers] = useState(createEmptyAnswers)
  const [stats, setStats] = useState<Stats | null>(null)
  const [appState, setAppState] = useState<AppState | null>(null)
  const [checkInResult, setCheckInResult] =
    useState<CheckInResponse['summary'] | null>(null)
  const [checkInError, setCheckInError] = useState('')
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  const [mode, setMode] = useState<AiMode>('broGroup')
  const [input, setInput] = useState('')
  const [providerSource, setProviderSource] = useState<'user' | 'admin'>('user')
  const [selectedBrotherIds, setSelectedBrotherIds] = useState<string[]>([])
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiError, setAiError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [providerForm, setProviderForm] =
    useState<ProviderForm>(emptyProviderForm)
  const [providerMessage, setProviderMessage] = useState('')
  const [providerError, setProviderError] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [isSavingProvider, setIsSavingProvider] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  const fallbackDailyRoast = useMemo(() => getDailyRoast(), [])
  const fallbackDailyTask = useMemo(() => getDailyTask(), [])
  const dailyRoast = stats?.dailyContent.dailyRoast ?? fallbackDailyRoast
  const dailyTask = stats?.dailyContent.dailyTask ?? fallbackDailyTask
  const currentScore = checkInResult?.score ?? stats?.today?.score ?? 0
  const currentLevel = checkInResult?.level ?? stats?.today?.level ?? '未打卡'
  const scoreWidth = `${Math.min(100, Math.round((currentScore / 12) * 100))}%`
  const user = appState?.user ?? initialUser
  const brothers = appState?.brothers?.length
    ? appState.brothers
    : DEFAULT_BROTHERS
  const canUseAdminProvider =
    (user.role === 'VIP' || user.role === 'ADMIN') &&
    Boolean(appState?.providers.admin.configured)

  async function fetchStats() {
    const response = await fetch('/api/stats')

    if (!response.ok) {
      throw new Error('统计加载失败')
    }

    return (await response.json()) as Stats
  }

  async function loadStats() {
    const data = await fetchStats()
    setStats(data)
    setAppState(data.appState)
    setAnswers(data.today?.answers ?? createEmptyAnswers())
    setProviderForm(providerFormFromSummary(data.appState.providers.user))

    if (!selectedBrotherIds.length) {
      setSelectedBrotherIds(data.brothers.map((brother) => brother.id))
    }

    if (!canUseAdminProvider && providerSource === 'admin') {
      setProviderSource('user')
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialStats() {
      try {
        const data = await fetchStats()

        if (!ignore) {
          setStats(data)
          setAppState(data.appState)
          setAnswers(data.today?.answers ?? createEmptyAnswers())
          setProviderForm(providerFormFromSummary(data.appState.providers.user))
          setSelectedBrotherIds(data.brothers.map((brother) => brother.id))
        }
      } catch {
        if (!ignore) {
          setCheckInError('数据库还没连上。Docker Compose 启动后它会自己清醒。')
        }
      }
    }

    void loadInitialStats()

    return () => {
      ignore = true
    }
  }, [])

  async function submitCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCheckingIn(true)
    setCheckInError('')

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '打卡失败')
      }

      setCheckInResult((payload as CheckInResponse).summary)
      await loadStats()
    } catch (error) {
      setCheckInError(
        error instanceof Error ? error.message : '打卡失败，先别怪她。',
      )
    } finally {
      setIsCheckingIn(false)
    }
  }

  async function submitAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsGenerating(true)
    setAiError('')
    setAiResult(null)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          input,
          providerSource,
          brotherIds: selectedBrotherIds,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '生成失败')
      }

      setAiResult(payload as AiResult)
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : '生成失败。先把聊天框关了，别趁乱发消息。',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingProvider(true)
    setProviderError('')
    setProviderMessage('')

    try {
      const response = await fetch('/api/provider/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '模型配置保存失败')
      }

      setProviderForm((current) => ({ ...current, apiKey: '' }))
      setProviderMessage('模型配置已保存。')
      await loadStats()
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : '模型配置保存失败。',
      )
    } finally {
      setIsSavingProvider(false)
    }
  }

  async function loadModels() {
    setIsLoadingModels(true)
    setProviderError('')
    setProviderMessage('')

    try {
      const response = await fetch('/api/provider/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: providerForm.url,
          apiKey: providerForm.apiKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '模型列表获取失败')
      }

      setModels(payload.models ?? [])
      setProviderMessage('模型列表已获取，也可以继续手动填写。')
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : '模型列表获取失败，请手动填写。',
      )
    } finally {
      setIsLoadingModels(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="骂了么首页">
          <span className="brand-mark" aria-hidden="true">
            骂
          </span>
          <span>
            骂了么
            <small>你上头，我开骂</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <span className="pill">
            <ShieldCheck size={16} />
            {user.role}
          </span>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <Settings size={16} />
            模型设置
          </button>
          {user.role === 'ADMIN' ? (
            <Link className="ghost-link" href="/admin">
              管理后台
            </Link>
          ) : null}
          <button className="ghost-button" type="button" onClick={logout}>
            <LogOut size={16} />
            退出
          </button>
        </div>
      </header>

      {settingsOpen ? (
        <section className="settings-panel">
          <div className="section-title">
            <KeyRound size={20} />
            <div>
              <p className="eyebrow">模型设置</p>
              <h2>配置你自己的 /chat/completions 模型</h2>
            </div>
          </div>
          <form className="settings-form" onSubmit={saveProvider}>
            <label>
              <span>URL</span>
              <input
                placeholder="https://api.openai.com/v1 或完整 /chat/completions"
                value={providerForm.url}
                onChange={(event) =>
                  setProviderForm((current) => ({
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
                  appState?.providers.user.apiKeyHint
                    ? `已保存 ${appState.providers.user.apiKeyHint}，留空则不修改`
                    : 'sk-...'
                }
                type="password"
                value={providerForm.apiKey}
                onChange={(event) =>
                  setProviderForm((current) => ({
                    ...current,
                    apiKey: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Model</span>
              <input
                list="model-options"
                placeholder="gpt-4o-mini / qwen-plus / ..."
                value={providerForm.model}
                onChange={(event) =>
                  setProviderForm((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
              />
              <datalist id="model-options">
                {models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
            <div className="settings-actions">
              <button
                className="secondary-button"
                disabled={isLoadingModels || !providerForm.url}
                type="button"
                onClick={loadModels}
              >
                {isLoadingModels ? <RefreshCw size={16} /> : <Brain size={16} />}
                获取模型
              </button>
              <button
                className="primary-button compact"
                disabled={isSavingProvider}
                type="submit"
              >
                保存配置
              </button>
            </div>
            {providerMessage ? (
              <p className="success-text">{providerMessage}</p>
            ) : null}
            {providerError ? <p className="error-text">{providerError}</p> : null}
          </form>
        </section>
      ) : null}

      <section className="dashboard">
        <div className="daily-panel">
          <p className="eyebrow">今日清醒提醒</p>
          <h1>别问她爱不爱你，先问你今天清醒了吗。</h1>
          <p className="roast">{dailyRoast}</p>
          <div className="task-strip">
            <span>今日戒断任务</span>
            <strong>{dailyTask}</strong>
          </div>
        </div>

        <aside className="meter-panel" aria-label="今日恋爱脑指数">
          <div className="meter-head">
            <span>恋爱脑指数</span>
            <strong>{currentScore}/12</strong>
          </div>
          <div className="meter-track" aria-hidden="true">
            <span style={{ width: scoreWidth }} />
          </div>
          <p className="meter-level">{currentLevel}</p>
          <div className="stats-grid">
            <div>
              <span>连续清醒</span>
              <strong>{stats?.consecutiveClearDays ?? 0} 天</strong>
            </div>
            <div>
              <span>复发次数</span>
              <strong>{stats?.relapseCount ?? 0}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="workbench">
        <form className="panel checkin-panel" onSubmit={submitCheckIn}>
          <div className="section-title">
            <Activity size={20} />
            <div>
              <p className="eyebrow">上头检测</p>
              <h2>今天有没有又开始替暧昧写剧本？</h2>
            </div>
          </div>

          <div className="question-list">
            {CHECKIN_QUESTIONS.map((question) => (
              <label className="question-row" key={question.id}>
                <input
                  checked={answers[question.id]}
                  type="checkbox"
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.checked,
                    }))
                  }
                />
                <span>{question.text}</span>
              </label>
            ))}
          </div>

          {checkInResult ? (
            <div className="result-note">
              <strong>{checkInResult.level}</strong>
              <span>{checkInResult.advice}</span>
            </div>
          ) : null}
          {checkInError ? <p className="error-text">{checkInError}</p> : null}

          <button className="primary-button" disabled={isCheckingIn} type="submit">
            {isCheckingIn ? <RefreshCw size={18} /> : <ShieldCheck size={18} />}
            {isCheckingIn ? '检测中' : '提交今日指数'}
          </button>
        </form>

        <section className="panel ai-panel">
          <div className="section-title">
            <Brain size={20} />
            <div>
              <p className="eyebrow">清醒工具箱</p>
              <h2>{AI_MODES[mode].label}</h2>
            </div>
          </div>

          <div className="mode-tabs two-modes" role="tablist" aria-label="AI 模式">
            {(Object.keys(AI_MODES) as AiMode[]).map((key) => (
              <button
                aria-selected={mode === key}
                className="mode-tab"
                key={key}
                role="tab"
                type="button"
                onClick={() => {
                  setMode(key)
                  setAiResult(null)
                  setAiError('')
                }}
              >
                {key === 'broGroup' ? <Users size={18} /> : <MessageCircle size={18} />}
                <span>{AI_MODES[key].label}</span>
              </button>
            ))}
          </div>

          <div className="provider-choice">
            <label>
              <input
                checked={providerSource === 'user'}
                type="radio"
                onChange={() => setProviderSource('user')}
              />
              我的模型
            </label>
            <label className={!canUseAdminProvider ? 'disabled-choice' : ''}>
              <input
                checked={providerSource === 'admin'}
                disabled={!canUseAdminProvider}
                type="radio"
                onChange={() => setProviderSource('admin')}
              />
              管理员模型（VIP）
            </label>
          </div>

          {mode === 'broGroup' ? (
            <div className="brother-picker">
              {brothers.map((brother) => (
                <label key={brother.id}>
                  <input
                    checked={selectedBrotherIds.includes(brother.id)}
                    type="checkbox"
                    onChange={(event) =>
                      setSelectedBrotherIds((current) =>
                        event.target.checked
                          ? [...current, brother.id]
                          : current.filter((id) => id !== brother.id),
                      )
                    }
                  />
                  <span>
                    <strong>{brother.name}</strong>
                    {brother.mbti ? <em>{brother.mbti}</em> : null}
                    {brother.description}
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          <form className="ai-form" onSubmit={submitAi}>
            <textarea
              maxLength={1200}
              placeholder={AI_MODES[mode].placeholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="primary-button"
              disabled={
                isGenerating ||
                input.trim().length === 0 ||
                (mode === 'broGroup' && selectedBrotherIds.length === 0)
              }
              type="submit"
            >
              {isGenerating ? <RefreshCw size={18} /> : <Send size={18} />}
              {isGenerating ? '开骂中' : '骂醒一下'}
            </button>
          </form>

          {aiError ? <p className="error-text">{aiError}</p> : null}

          {aiResult ? (
            <div className="ai-result">
              {aiResult.missingProvider ? (
                <p className="warning-text">先配置可用模型，再让它开骂。</p>
              ) : null}
              {aiResult.safetyNotice ? (
                <p className="warning-text">
                  检测到安全风险，已切换为保护性建议。
                </p>
              ) : null}
              {aiResult.mode === 'directReply' ? (
                <article>
                  <span>直接回复</span>
                  <p>{aiResult.content}</p>
                </article>
              ) : (
                aiResult.replies.map((reply) => (
                  <article key={`${reply.brotherId}-${reply.name}`}>
                    <span>{reply.name}</span>
                    <p>{reply.content}</p>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </section>
      </section>

      <section className="history-panel">
        <div className="section-title">
          <MessageCircle size={20} />
          <div>
            <p className="eyebrow">最近记录</p>
            <h2>别让复发悄悄变成连续剧。</h2>
          </div>
        </div>
        <div className="history-list">
          {stats?.history.length ? (
            stats.history.slice(0, 7).map((item) => (
              <div className="history-row" key={item.id}>
                <span>{item.dateKey}</span>
                <strong>{item.score}/12</strong>
                <em>{item.level}</em>
              </div>
            ))
          ) : (
            <p className="muted">还没有记录。今天先把第一刀补上。</p>
          )}
        </div>
      </section>
    </main>
  )
}
