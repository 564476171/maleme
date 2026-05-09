'use client'

import { useEffect, useMemo, useState } from 'react'

const rescueLines = [
  '你现在发出去的不是消息，是把主动权双手奉上。',
  '她三分钟没回，你脑内已经拍到第八集，这不是爱情，是戒断反应。',
  '先把手机扣下。真正喜欢你的人，不需要你用失控来证明自己存在。',
]

const countdownSeconds = 30

export default function SosRescue() {
  const [open, setOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds)
  const [lineIndex, setLineIndex] = useState(0)

  const canExit = secondsLeft <= 0
  const activeLine = useMemo(() => rescueLines[lineIndex], [lineIndex])

  function openRescue() {
    setSecondsLeft(countdownSeconds)
    setLineIndex(0)
    setOpen(true)
  }

  useEffect(() => {
    if (!open || secondsLeft <= 0) return

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [open, secondsLeft])

  useEffect(() => {
    if (!open) return

    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % rescueLines.length)
    }, 3800)

    return () => window.clearInterval(timer)
  }, [open])

  return (
    <>
      <button
        className="sos-button"
        type="button"
        onClick={openRescue}
      >
        🚨 我马上要忍不住给她发消息了！
      </button>

      {open ? (
        <section className="sos-overlay theme-danger" aria-modal="true" role="dialog">
          <div className="sos-panel shake-alert">
            <p className="sos-kicker">紧急阻断中</p>
            <strong className="sos-count">{secondsLeft}s</strong>
            <p className="sos-line" key={activeLine}>
              {activeLine}
            </p>
            <p className="sos-lock">
              {canExit
                ? '现在你可以退出。退出之前，再确认一次：不发，就是赢。'
                : '30 秒内不能关闭。你的手现在不负责决策。'}
            </p>
            <button
              className="sos-exit"
              disabled={!canExit}
              type="button"
              onClick={() => setOpen(false)}
            >
              我冷静了，退出
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
