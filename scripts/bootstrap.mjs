import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const scryptAsync = promisify(crypto.scrypt)

const defaultBrothers = [
  {
    id: 'J',
    name: 'J',
    mbti: 'INTJ',
    description:
      '极度理智的社会达尔文主义者，擅长把暧昧幻想拆成冷冰冰的事实。',
    catchphrase: '哎呀，你怎么又',
    sortOrder: 10,
  },
  {
    id: 'L',
    name: 'L',
    mbti: 'INTP',
    description:
      '技术宅，非常没有耐心，尤其受不了把普通聊天当命运暗示的人。',
    catchphrase: '你去问 AI，都复制过去',
    sortOrder: 20,
  },
  {
    id: 'W',
    name: 'W',
    mbti: null,
    description: '热情、思维跳脱、随性，负责把气氛拉起来但仍然把人骂醒。',
    catchphrase: '先别演了',
    sortOrder: 30,
  },
]

const roasts = [
  '她说“哈哈哈”不是爱你。她说“你真好”也不是爱你。她没说“我喜欢你”，那就别替她写剧本。',
  '早安，别醒来第一件事就看她有没有回你。你不是她的男主角，你只是她消息列表里一个比较会自我感动的人。',
  '你今天又想她了？问题不大。但你先想想：她想你了吗？',
  '热情不是承诺，暧昧不是关系，情绪价值不是爱情，脑补不是证据。',
  '她忽冷忽热不是宿命感，是你的不确定性奖励机制被摁了开关。',
]

const tasks = [
  '不主动发消息 24 小时，把手腾出来做一件真正对你有益的事。',
  '不看她朋友圈。你不是侦探，她也不是案发现场。',
  '写下：我喜欢的是她本人，还是她给我的情绪刺激？',
  '洗澡、吃饭、运动。先把自己从支线任务里救出来。',
  '今天不搜索“她是不是喜欢我”。没有明确表达，就先按没有处理。',
]

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64)

  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.warn('ADMIN_EMAIL or ADMIN_PASSWORD missing; admin bootstrap skipped.')
    return
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      disabled: false,
    },
    create: {
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  })

  console.log(`Admin account ready: ${email}`)
}

async function bootstrapSettings() {
  await prisma.appSetting.upsert({
    where: { key: 'registrationMode' },
    update: {},
    create: {
      key: 'registrationMode',
      value: 'OPEN',
    },
  })

  for (const brother of defaultBrothers) {
    await prisma.brotherPersona.upsert({
      where: { id: brother.id },
      update: {},
      create: brother,
    })
  }

  const existingContentCount = await prisma.contentItem.count()

  if (existingContentCount === 0) {
    await prisma.contentItem.createMany({
      data: [
        ...roasts.map((content, index) => ({
          type: 'DAILY_ROAST',
          content,
          sortOrder: index,
        })),
        ...tasks.map((content, index) => ({
          type: 'DAILY_TASK',
          content,
          sortOrder: index,
        })),
      ],
    })
  }
}

try {
  await bootstrapAdmin()
  await bootstrapSettings()
} finally {
  await prisma.$disconnect()
}
