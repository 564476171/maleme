type ThinkingFilter = {
  push: (value: string) => string
  flush: () => string
}

const thinkingTagPattern = /<\s*(\/?)\s*think(?:ing)?\b[^>]*>/i
const partialOpeningTokens = ['<think', '<thinking', '</think', '</thinking']
const partialClosingTokens = ['</think', '</thinking']

function findThinkingTag(value: string) {
  const match = thinkingTagPattern.exec(value)

  if (!match || typeof match.index !== 'number') {
    return null
  }

  return {
    index: match.index,
    length: match[0].length,
    closing: Boolean(match[1]),
  }
}

function findPartialThinkingTag(value: string, closingOnly = false) {
  const tagStart = value.lastIndexOf('<')

  if (tagStart < 0) {
    return -1
  }

  const suffix = value.slice(tagStart)

  if (suffix.includes('>')) {
    return -1
  }

  const normalized = suffix.toLowerCase().replace(/\s+/g, '')
  const tokens = closingOnly ? partialClosingTokens : partialOpeningTokens

  return tokens.some(
    (token) => token.startsWith(normalized) || normalized.startsWith(token),
  )
    ? tagStart
    : -1
}

export function createThinkingContentFilter(): ThinkingFilter {
  let buffer = ''
  let insideThinking = false

  return {
    push(value: string) {
      buffer += value
      let visible = ''

      while (buffer) {
        if (insideThinking) {
          const tag = findThinkingTag(buffer)

          if (!tag) {
            const partialIndex = findPartialThinkingTag(buffer, true)
            buffer = partialIndex >= 0 ? buffer.slice(partialIndex) : ''
            break
          }

          if (tag.closing) {
            buffer = buffer.slice(tag.index + tag.length)
            insideThinking = false
            continue
          }

          buffer = buffer.slice(tag.index + tag.length)
          continue
        }

        const tag = findThinkingTag(buffer)

        if (!tag) {
          const partialIndex = findPartialThinkingTag(buffer)

          if (partialIndex >= 0) {
            visible += buffer.slice(0, partialIndex)
            buffer = buffer.slice(partialIndex)
            break
          }

          visible += buffer
          buffer = ''
          break
        }

        visible += buffer.slice(0, tag.index)
        buffer = buffer.slice(tag.index + tag.length)
        insideThinking = !tag.closing
      }

      return visible
    },

    flush() {
      if (insideThinking) {
        buffer = ''
        return ''
      }

      const visible = buffer
      buffer = ''

      return visible
    },
  }
}

export function stripThinkingContent(value: string): string {
  const filter = createThinkingContentFilter()

  return `${filter.push(value)}${filter.flush()}`
    .replace(/<\s*\/?\s*think(?:ing)?\b[^>]*>/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function stripThinkingFromValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripThinkingContent(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripThinkingFromValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        stripThinkingFromValue(item),
      ]),
    )
  }

  return value
}
