export type CheckInAnswers = Record<string, boolean>

export type ScoreSummary = {
  score: number
  level: string
  advice: string
}

export function summarizeScore(answers: CheckInAnswers): ScoreSummary {
  const score = Object.values(answers).filter(Boolean).length * 2

  if (score <= 2) {
    return {
      score,
      level: '暂时清醒',
      advice: '今天还算稳，别主动给脑补加戏。',
    }
  }

  if (score <= 5) {
    return {
      score,
      level: '轻度上头',
      advice: '已经开始冒烟了，先停下手里的聊天框。',
    }
  }

  if (score <= 8) {
    return {
      score,
      level: '恋爱脑预警',
      advice: '你不是在恋爱，你是在给不确定性打工。',
    }
  }

  return {
    score,
    level: '建议断网、洗澡、运动、找兄弟骂醒',
    advice: '立刻离开聊天框，先把自己的人生捡回来。',
  }
}

export function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)

  return date.toISOString().slice(0, 10)
}
