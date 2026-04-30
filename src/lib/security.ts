import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(crypto.scrypt)
const passwordKeyLength = 64

function getAppSecret() {
  const secret = process.env.APP_SECRET

  if (!secret || secret.length < 32) {
    throw new Error('APP_SECRET must be set to at least 32 characters')
  }

  return secret
}

function encryptionKey() {
  return crypto.createHash('sha256').update(getAppSecret()).digest()
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(
    password,
    salt,
    passwordKeyLength,
  )) as Buffer

  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, key] = passwordHash.split(':')

  if (algorithm !== 'scrypt' || !salt || !key) {
    return false
  }

  const derivedKey = (await scryptAsync(
    password,
    salt,
    passwordKeyLength,
  )) as Buffer
  const storedKey = Buffer.from(key, 'hex')

  return (
    storedKey.length === derivedKey.length &&
    crypto.timingSafeEqual(storedKey, derivedKey)
  )
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':')

  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Unsupported encrypted secret format')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskSecret(value: string) {
  if (!value) {
    return ''
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}****${value.slice(-2)}`
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`
}
