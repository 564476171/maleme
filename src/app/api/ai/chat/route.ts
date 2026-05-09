import { type ProviderConfig } from '@prisma/client'
import {
  aiChatRequestSchema,
  buildFollowUpMessages,
  createChatCompletionStream,
  hasSafetyRisk,
  readOpenAiStream,
} from '@/lib/ai'
import { getCurrentUser } from '@/lib/auth'
import { type AiMode, type BrotherPersona } from '@/lib/content'
import { getEnabledBrothers } from '@/lib/content-db'
import { prisma } from '@/lib/prisma'
import { resolveProviderForUser } from '@/lib/provider'
import { stripThinkingContent } from '@/lib/thinking-filter'

type StreamTarget = {
  brother?: BrotherPersona
  messageId: string
  name: string
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function streamSystemMessage(content: string, status = 200) {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            encodeSse('warning', {
              messageId: `system-${crypto.randomUUID()}`,
              content,
            }),
          ),
        )
        controller.enqueue(
          encoder.encode(encodeSse('conversation_done', { ok: true })),
        )
        controller.close()
      },
    }),
    {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
    },
  )
}

async function streamTarget({
  controller,
  encoder,
  mode,
  input,
  messages,
  provider,
  target,
}: {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  mode: AiMode
  input: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    name?: string
    content: string
    brotherId?: string
  }>
  provider: ProviderConfig
  target: StreamTarget
}) {
  let content = ''

  function write(event: string, data: unknown) {
    controller.enqueue(encoder.encode(encodeSse(event, data)))
  }

  write('message_start', {
    messageId: target.messageId,
    brotherId: target.brother?.id,
    name: target.name,
  })

  try {
    const body = await createChatCompletionStream({
      provider,
      messages: buildFollowUpMessages({
        mode,
        input,
        messages,
        brother: target.brother,
      }),
    })

    for await (const delta of readOpenAiStream(body)) {
      content += delta
      write('message_delta', {
        messageId: target.messageId,
        brotherId: target.brother?.id,
        delta,
      })
    }

    write('message_done', {
      messageId: target.messageId,
      brotherId: target.brother?.id,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '这一位兄弟刚刚掉线了。'

    write('error', {
      messageId: target.messageId,
      brotherId: target.brother?.id,
      content: message,
    })

    content = message
  }

  return {
    brotherId: target.brother?.id,
    name: target.name,
    content: stripThinkingContent(content),
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return Response.json({ error: '请先登录。' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = aiChatRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: '追问内容太短或太长了，先压缩成人类能读懂的版本。' },
      { status: 400 },
    )
  }

  if (hasSafetyRisk(parsed.data.input)) {
    return streamSystemMessage(
      '这已经不是暧昧分析范围了。先停止联系和靠近，马上找可信任的朋友、家人或当地紧急支持资源。',
    )
  }

  let provider: ProviderConfig

  try {
    provider = await resolveProviderForUser({
      user,
      source: parsed.data.providerSource,
    })
  } catch (error) {
    return streamSystemMessage(
      error instanceof Error ? error.message : '先配置可用模型，再继续对话。',
    )
  }

  const allBrothers = await getEnabledBrothers()
  const selectedBrothers =
    parsed.data.mode === 'broGroup'
      ? allBrothers.filter((brother) =>
          parsed.data.brotherIds.includes(brother.id),
        )
      : []

  if (parsed.data.mode === 'broGroup' && !selectedBrothers.length) {
    return streamSystemMessage('至少选一个兄弟，不然没人把你拽回来。')
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function write(event: string, data: unknown) {
        controller.enqueue(encoder.encode(encodeSse(event, data)))
      }

      const targets: StreamTarget[] =
        parsed.data.mode === 'broGroup'
          ? selectedBrothers.map((brother) => ({
              brother,
              messageId: `assistant-${brother.id}-${crypto.randomUUID()}`,
              name: brother.name,
            }))
          : [
              {
                messageId: `assistant-direct-${crypto.randomUUID()}`,
                name: '直接回复',
              },
            ]

      try {
        const replies = await Promise.all(
          targets.map((target) =>
            streamTarget({
              controller,
              encoder,
              mode: parsed.data.mode,
              input: parsed.data.input,
              messages: parsed.data.messages,
              provider,
              target,
            }),
          ),
        )

        await prisma.aiReflection.create({
          data: {
            userId: user.id,
            mode: parsed.data.messages.length
              ? `${parsed.data.mode}:followUp`
              : parsed.data.mode,
            input: parsed.data.input,
            output: {
              mode: parsed.data.mode,
              followUp: parsed.data.messages.length > 0,
              replies,
            },
          },
        })

        write('conversation_done', { ok: true })
      } catch (error) {
        write('error', {
          messageId: `system-${crypto.randomUUID()}`,
          content:
            error instanceof Error
              ? error.message
              : '多轮对话刚刚噎住了，先别趁乱发消息。',
        })
        write('conversation_done', { ok: false })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  })
}
