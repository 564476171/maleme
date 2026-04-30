import { type ProviderConfig, type User } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/security'

export const providerInputSchema = z.object({
  url: z.string().trim().url(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(80).optional(),
})

export type ProviderInput = z.infer<typeof providerInputSchema>

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

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function normalizeProviderUrls(inputUrl: string) {
  const url = new URL(inputUrl.trim())
  url.pathname = stripTrailingSlash(url.pathname)
  url.search = ''
  url.hash = ''

  const normalized = stripTrailingSlash(url.toString())
  const chatSuffix = '/chat/completions'
  const modelsSuffix = '/models'

  if (normalized.endsWith(chatSuffix)) {
    const baseUrl = normalized.slice(0, -chatSuffix.length)

    return {
      baseUrl,
      chatUrl: normalized,
      modelsUrl: `${baseUrl}${modelsSuffix}`,
    }
  }

  if (normalized.endsWith(modelsSuffix)) {
    const baseUrl = normalized.slice(0, -modelsSuffix.length)

    return {
      baseUrl,
      chatUrl: `${baseUrl}${chatSuffix}`,
      modelsUrl: normalized,
    }
  }

  const baseUrl = normalized.endsWith('/v1') ? normalized : `${normalized}/v1`

  return {
    baseUrl,
    chatUrl: `${baseUrl}${chatSuffix}`,
    modelsUrl: `${baseUrl}${modelsSuffix}`,
  }
}

export function providerToSummary(
  provider: ProviderConfig | null,
): ProviderSummary {
  if (!provider) {
    return { configured: false }
  }

  return {
    configured: true,
    name: provider.name,
    baseUrl: provider.baseUrl,
    chatUrl: provider.chatUrl,
    modelsUrl: provider.modelsUrl,
    model: provider.model,
    apiKeyHint: provider.apiKeyHint,
    updatedAt: provider.updatedAt.toISOString(),
  }
}

export async function saveProvider({
  scope,
  userId,
  input,
}: {
  scope: 'ADMIN' | 'USER'
  userId?: string
  input: ProviderInput
}) {
  const urls = normalizeProviderUrls(input.url)
  const configKey = scope === 'ADMIN' ? 'admin' : `user:${userId}`
  const apiKeyUpdate = input.apiKey
    ? {
        apiKeyEncrypted: encryptSecret(input.apiKey),
        apiKeyHint: maskSecret(input.apiKey),
      }
    : {}

  return prisma.providerConfig.upsert({
    where: { configKey },
    update: {
      scope,
      userId: scope === 'USER' ? userId : null,
      name: input.name ?? (scope === 'ADMIN' ? '管理员模型' : '我的模型'),
      baseUrl: urls.baseUrl,
      chatUrl: urls.chatUrl,
      modelsUrl: urls.modelsUrl,
      model: input.model,
      ...apiKeyUpdate,
    },
    create: {
      configKey,
      scope,
      userId: scope === 'USER' ? userId : null,
      name: input.name ?? (scope === 'ADMIN' ? '管理员模型' : '我的模型'),
      baseUrl: urls.baseUrl,
      chatUrl: urls.chatUrl,
      modelsUrl: urls.modelsUrl,
      model: input.model,
      ...apiKeyUpdate,
    },
  })
}

export async function getAdminProvider() {
  return prisma.providerConfig.findUnique({ where: { configKey: 'admin' } })
}

export async function getUserProvider(userId: string) {
  return prisma.providerConfig.findUnique({
    where: { configKey: `user:${userId}` },
  })
}

export function getProviderApiKey(provider: ProviderConfig) {
  if (!provider.apiKeyEncrypted) {
    throw new Error('Provider API key is missing')
  }

  return decryptSecret(provider.apiKeyEncrypted)
}

export async function resolveProviderForUser({
  user,
  source,
}: {
  user: User
  source: 'admin' | 'user'
}) {
  if (source === 'admin') {
    if (user.role !== 'VIP' && user.role !== 'ADMIN') {
      throw new Error('普通用户不能使用管理员模型。')
    }

    const provider = await getAdminProvider()

    if (!provider) {
      throw new Error('管理员模型还没有配置。')
    }

    return provider
  }

  const provider = await getUserProvider(user.id)

  if (!provider) {
    throw new Error('请先配置你自己的模型。')
  }

  return provider
}

export async function fetchModels({
  url,
  apiKey,
}: {
  url: string
  apiKey?: string
}) {
  const { modelsUrl } = normalizeProviderUrls(url)
  const response = await fetch(modelsUrl, {
    headers: apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`模型列表获取失败：${response.status}`)
  }

  const payload = await response.json()
  const models = Array.isArray(payload.data)
    ? payload.data
        .map((item: { id?: unknown }) =>
          typeof item.id === 'string' ? item.id : null,
        )
        .filter(Boolean)
    : []

  return models as string[]
}
