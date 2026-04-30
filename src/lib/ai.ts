import { type ProviderConfig } from '@prisma/client'
import { z } from 'zod'
import {
  type AiMode,
  type AiResult,
  type BrotherPersona,
  AI_MODES,
} from '@/lib/content'
import { getProviderApiKey } from '@/lib/provider'

export const aiRequestSchema = z.object({
  mode: z.enum(['broGroup', 'directReply']),
  input: z.string().trim().min(1).max(1200),
  providerSource: z.enum(['user', 'admin']).default('user'),
  brotherIds: z.array(z.string()).default([]),
})

const riskWords = [
  '自杀',
  '不想活',
  '伤害她',
  '杀了',
  '跟踪',
  '尾随',
  '堵她',
  '报复',
  '威胁',
  '强迫',
]

export function hasSafetyRisk(input: string) {
  return riskWords.some((word) => input.includes(word))
}

export function buildSafetyResponse(mode: AiMode): AiResult {
  if (mode === 'broGroup') {
    return {
      mode,
      replies: [
        {
          brotherId: 'SAFETY',
          name: '安全提醒',
          content:
            '这已经不是暧昧分析范围了。先停止联系和靠近，马上找可信任的朋友、家人或当地紧急支持资源。',
        },
      ],
      safetyNotice: true,
    }
  }

  return {
    mode,
    content:
      '这已经不是暧昧分析范围了。现在最重要的是让你和对方都保持安全。请先停止联系和靠近，马上联系可信任的朋友、家人或当地紧急支持资源。如果你担心自己会伤害自己或别人，请立刻拨打当地紧急电话。',
    safetyNotice: true,
  }
}

export function buildMissingProviderResponse(mode: AiMode): AiResult {
  if (mode === 'broGroup') {
    return {
      mode,
      replies: [
        {
          brotherId: 'SYSTEM',
          name: '系统',
          content: '先配置模型再开骂。没有模型，兄弟团只能在门口干着急。',
        },
      ],
      missingProvider: true,
    }
  }

  return {
    mode,
    content: '先配置模型 URL、API Key 和 Model。没有模型，清醒文案只能靠你自己硬撑。',
    missingProvider: true,
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced ?? text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1)
  }

  return candidate
}

function parseAiResult(mode: AiMode, text: string, brothers: BrotherPersona[]) {
  try {
    const parsed = JSON.parse(extractJson(text))

    if (mode === 'broGroup' && Array.isArray(parsed.replies)) {
      return {
        mode,
        replies: parsed.replies
          .map(
            (reply: {
              brotherId?: unknown
              name?: unknown
              content?: unknown
            }) => ({
              brotherId:
                typeof reply.brotherId === 'string' ? reply.brotherId : '',
              name: typeof reply.name === 'string' ? reply.name : '兄弟',
              content:
                typeof reply.content === 'string' ? reply.content : '',
            }),
          )
          .filter((reply: { content: string }) => reply.content.trim()),
      } satisfies AiResult
    }

    if (mode === 'directReply' && typeof parsed.content === 'string') {
      return {
        mode,
        content: parsed.content,
      } satisfies AiResult
    }
  } catch {
    // Fall through to text fallback.
  }

  if (mode === 'broGroup') {
    return {
      mode,
      replies: brothers.map((brother) => ({
        brotherId: brother.id,
        name: brother.name,
        content: `${brother.name}：${text}`,
      })),
    } satisfies AiResult
  }

  return {
    mode,
    content: text,
  } satisfies AiResult
}

function buildSystemPrompt(mode: AiMode, brothers: BrotherPersona[]) {
  const shared = [
    '你是“骂了么”，一个帮助用户从暧昧脑补、恋爱脑上头和不确定性奖励里清醒下来的中文助手。',
    '风格是嘴毒但关心：好笑、扎心、短句、有兄弟感，但不要羞辱用户。',
    '不要攻击 ENFP、女性、任何人格类型或具体对象。重点放在用户自己的模式：理想化、沉迷高情绪价值、把暧昧当命运。',
    '不要替对方确认喜欢或不喜欢。只区分事实、脑补和可执行行动。',
    '不要鼓励骚扰、试探、跟踪、威胁或突破边界。',
  ]

  if (mode === 'broGroup') {
    return [
      ...shared,
      '当前模式：兄弟团模式。每个选中的兄弟必须独立发言。',
      '只输出 JSON：{"replies":[{"brotherId":"J","name":"J","content":"..."}]}。',
      '兄弟人设：',
      ...brothers.map(
        (brother) =>
          `${brother.id}/${brother.name}${brother.mbti ? `/${brother.mbti}` : ''}：${brother.description} 常用语气：${brother.catchphrase || '无'}`,
      ),
    ].join('\n')
  }

  return [
    ...shared,
    '当前模式：直接回复模式。直接生成一段清醒文案，包含现实判断、嘴毒提醒和下一步行动。',
    '只输出 JSON：{"content":"..."}。',
  ].join('\n')
}

export async function generateAiResponse({
  mode,
  input,
  provider,
  brothers,
}: {
  mode: AiMode
  input: string
  provider: ProviderConfig | null
  brothers: BrotherPersona[]
}) {
  if (hasSafetyRisk(input)) {
    return buildSafetyResponse(mode)
  }

  if (!provider) {
    return buildMissingProviderResponse(mode)
  }

  const response = await fetch(provider.chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getProviderApiKey(provider)}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(mode, brothers),
        },
        {
          role: 'user',
          content: [
            `模式：${AI_MODES[mode].label}`,
            `用户描述：${input}`,
            '请严格按照系统要求输出 JSON。',
          ].join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`模型调用失败：${response.status}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('模型没有返回 chat/completions message content')
  }

  return parseAiResult(mode, content, brothers)
}
