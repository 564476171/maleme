export const CHECKIN_QUESTIONS = [
  {
    id: 'checked_social',
    text: '今天是否反复看她朋友圈/动态？',
  },
  {
    id: 'reply_mood',
    text: '是否因为她的回复速度影响情绪？',
  },
  {
    id: 'future_fantasy',
    text: '是否脑补过你们的未来？',
  },
  {
    id: 'changed_plan',
    text: '是否为她推掉自己的安排？',
  },
  {
    id: 'searched_signals',
    text: '是否查过 MBTI / 星座 / 暧昧心理学？',
  },
  {
    id: 'she_is_different',
    text: '是否觉得“她和别人不一样”？',
  },
] as const

export const DAILY_ROASTS = [
  '她说“哈哈哈”不是爱你。她说“你真好”也不是爱你。她没说“我喜欢你”，那就别替她写剧本。',
  '早安，别醒来第一件事就看她有没有回你。你不是她的男主角，你只是她消息列表里一个比较会自我感动的人。',
  '你今天又想她了？问题不大。但你先想想：她想你了吗？',
  '热情不是承诺，暧昧不是关系，情绪价值不是爱情，脑补不是证据。',
  '她忽冷忽热不是宿命感，是你的不确定性奖励机制被摁了开关。',
]

export const DAILY_TASKS = [
  '不主动发消息 24 小时，把手腾出来做一件真正对你有益的事。',
  '不看她朋友圈。你不是侦探，她也不是案发现场。',
  '写下：我喜欢的是她本人，还是她给我的情绪刺激？',
  '洗澡、吃饭、运动。先把自己从支线任务里救出来。',
  '今天不搜索“她是不是喜欢我”。没有明确表达，就先按没有处理。',
]

export const AI_MODES = {
  broGroup: {
    label: '兄弟团模式',
    placeholder: '比如：她今天给我发了一个“哈哈哈”，我感觉她对我有意思。',
  },
  directReply: {
    label: '直接回复模式',
    placeholder: '比如：她三小时没回，我已经开始想是不是我哪里说错了。',
  },
} as const

export type AiMode = keyof typeof AI_MODES

export type BrotherPersona = {
  id: string
  name: string
  mbti: string
  description: string
  catchphrase: string
  enabled: boolean
}

export type BrotherReply = {
  brotherId: string
  name: string
  content: string
}

export type AiResult =
  | {
      mode: 'directReply'
      content: string
      missingProvider?: boolean
      safetyNotice?: boolean
    }
  | {
      mode: 'broGroup'
      replies: BrotherReply[]
      missingProvider?: boolean
      safetyNotice?: boolean
    }

export const DEFAULT_BROTHERS: BrotherPersona[] = [
  {
    id: 'J',
    name: 'J',
    mbti: 'INTJ',
    description:
      '极度理智的社会达尔文主义者，擅长把暧昧幻想拆成冷冰冰的事实。',
    catchphrase: '哎呀，你怎么又',
    enabled: true,
  },
  {
    id: 'L',
    name: 'L',
    mbti: 'INTP',
    description:
      '技术宅，非常没有耐心，尤其受不了把普通聊天当命运暗示的人。',
    catchphrase: '你去问 AI，都复制过去',
    enabled: true,
  },
  {
    id: 'W',
    name: 'W',
    mbti: '',
    description: '热情、思维跳脱、随性，负责把气氛拉起来但仍然把人骂醒。',
    catchphrase: '先别演了',
    enabled: true,
  },
]

export type ProviderSummary = {
  configured: boolean
  name?: string
  baseUrl?: string
  chatUrl?: string
  modelsUrl?: string
  model?: string
  apiKeyHint?: string | null
  updatedAt?: string
}

export type AppUser = {
  id: string
  email: string
  role: 'USER' | 'VIP' | 'ADMIN'
  disabled: boolean
}

export type AppState = {
  user: AppUser
  providers: {
    user: ProviderSummary
    admin: ProviderSummary
  }
  brothers: BrotherPersona[]
  registrationMode: 'OPEN' | 'INVITE' | 'CLOSED'
}

export function getDailyIndex(date = new Date()) {
  const seed = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .replaceAll('-', ''),
  )

  return seed
}

export function getDailyRoast(date = new Date()) {
  return DAILY_ROASTS[getDailyIndex(date) % DAILY_ROASTS.length]
}

export function getDailyTask(date = new Date()) {
  return DAILY_TASKS[getDailyIndex(date) % DAILY_TASKS.length]
}
