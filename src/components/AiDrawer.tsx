'use client'

import { FormEvent, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import { type AiMode, type BrotherPersona } from '@/lib/content'
import { stripThinkingContent } from '@/lib/thinking-filter'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  name?: string
  content: string
  brotherId?: string
  streaming?: boolean
  tone?: 'warning'
}

type AiDrawerProps = {
  mode: AiMode
  brothers: BrotherPersona[]
  followUpBrotherIds: string[]
  followUpInput: string
  messages: ChatMessage[]
  open: boolean
  loading: boolean
  followUpLoading: boolean
  onClose: () => void
  onFollowUpBrotherIdsChange: (ids: string[]) => void
  onFollowUpInputChange: (value: string) => void
  onFollowUpSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function AiDrawer({
  mode,
  brothers,
  followUpBrotherIds,
  followUpInput,
  messages,
  open,
  loading,
  followUpLoading,
  onClose,
  onFollowUpBrotherIdsChange,
  onFollowUpInputChange,
  onFollowUpSubmit,
}: AiDrawerProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) {
    return null
  }

  const title =
    mode === 'broGroup'
      ? brothers.length
        ? brothers.map((brother) => brother.name).join(' / ')
        : '兄弟团待命'
      : '直接回复模式'
  const tags =
    mode === 'broGroup'
      ? brothers.flatMap((brother) =>
          brother.mbti ? [`${brother.name} ${brother.mbti}`] : [brother.name],
        )
      : ['快速清醒', '不替她写剧本']

  return (
    <div className="drawer-shell open">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        aria-label="清醒工具箱对话"
        aria-modal="true"
        className="ai-drawer"
        role="dialog"
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow">清醒对话</p>
            <h2>{title}</h2>
            <div className="drawer-tags" aria-label="当前角色标签">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <button
            aria-label="关闭清醒对话"
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>

        <div className="chat-list">
          {messages.length ? (
            messages.map((message) => (
              <article
                className={`chat-message ${message.role} ${
                  message.tone === 'warning' ? 'warning' : ''
                } ${message.streaming ? 'streaming' : ''}`}
                key={message.id}
              >
                <span>
                  {message.name ?? (message.role === 'user' ? '你' : '骂了么')}
                  {message.streaming ? ' 正在输入...' : ''}
                </span>
                <p>
                  {stripThinkingContent(message.content) ||
                    (message.streaming ? '...' : '')}
                </p>
              </article>
            ))
          ) : (
            <p className="muted">把剧情丢进来，别自己在脑内开连续剧。</p>
          )}
          {loading ? (
            <article className="chat-message assistant loading">
              <span>{mode === 'broGroup' ? '兄弟团' : '骂了么'}</span>
              <p>{mode === 'broGroup' ? '兄弟们正在输入中...' : '正在输入中...'}</p>
            </article>
          ) : null}
        </div>

        <form className="drawer-compose" onSubmit={onFollowUpSubmit}>
          {mode === 'broGroup' ? (
            <div className="drawer-compose-brothers">
              <span>本轮兄弟</span>
              <div
                className="drawer-brother-picker"
                aria-label="本轮加入对话的兄弟"
              >
                {brothers.map((brother) => {
                  const checked = followUpBrotherIds.includes(brother.id)

                  return (
                    <label className={checked ? 'selected' : ''} key={brother.id}>
                      <input
                        checked={checked}
                        disabled={followUpLoading}
                        type="checkbox"
                        onChange={(event) =>
                          onFollowUpBrotherIdsChange(
                            event.target.checked
                              ? [...followUpBrotherIds, brother.id]
                              : followUpBrotherIds.filter(
                                  (id) => id !== brother.id,
                                ),
                          )
                        }
                      />
                      <span>
                        {brother.name}
                        {brother.mbti ? ` / ${brother.mbti}` : ''}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="drawer-compose-row">
            <textarea
              maxLength={1200}
              placeholder={
                mode === 'broGroup'
                  ? '继续追问，让选中的兄弟一起把你拽回来。'
                  : '继续追问，我流式把你骂醒。'
              }
              value={followUpInput}
              onChange={(event) => onFollowUpInputChange(event.target.value)}
            />
            <button
              aria-label="发送追问"
              className="primary-button compact"
              disabled={
                followUpLoading ||
                !followUpInput.trim() ||
                (mode === 'broGroup' && followUpBrotherIds.length === 0)
              }
              type="submit"
            >
              <Send size={18} />
              {followUpLoading ? '输出中' : '追问'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
