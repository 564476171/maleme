import { type ContentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DAILY_ROASTS,
  DAILY_TASKS,
  getDailyIndex,
  type BrotherPersona,
} from '@/lib/content'

export async function getEnabledContent(type: ContentType) {
  return prisma.contentItem.findMany({
    where: { type, enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getDailyContent() {
  const [roasts, tasks] = await Promise.all([
    getEnabledContent('DAILY_ROAST'),
    getEnabledContent('DAILY_TASK'),
  ])
  const index = getDailyIndex()

  return {
    dailyRoast:
      roasts[index % roasts.length]?.content ??
      DAILY_ROASTS[index % DAILY_ROASTS.length],
    dailyTask:
      tasks[index % tasks.length]?.content ??
      DAILY_TASKS[index % DAILY_TASKS.length],
  }
}

export async function getEnabledBrothers(): Promise<BrotherPersona[]> {
  const brothers = await prisma.brotherPersona.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return brothers.map((brother) => ({
    id: brother.id,
    name: brother.name,
    mbti: brother.mbti ?? '',
    description: brother.description,
    catchphrase: brother.catchphrase ?? '',
    enabled: brother.enabled,
  }))
}
