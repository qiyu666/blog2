// Auth helpers: password hashing (PBKDF2), sessions, cookies.
// Uses Web Crypto API available in the Workers runtime.

import { json, error } from './_helpers'

const encoder = new TextEncoder()
const PBKDF2_ITERATIONS = 100_000
const SESSION_BYTES = 32
const SESSION_TTL_DAYS = 30

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return arr
}

export function randomHex(byteLen: number): string {
  const arr = new Uint8Array(byteLen)
  crypto.getRandomValues(arr)
  return bytesToHex(arr)
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const salt = hexToBytes(saltHex)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return bytesToHex(new Uint8Array(derived))
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, saltHex)
  // constant-time-ish comparison
  if (hash.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return diff === 0
}

export interface SessionUser {
  id: number
  username: string
  email: string
  role: string
  avatar: string
  bio: string
  created_at: string
}

export interface AuthContext {
  request: Request
  env: { DB: D1Database }
  user: SessionUser | null
  sessionToken: string | null
}

export async function getSession(
  request: Request,
  db: D1Database
): Promise<{ user: SessionUser | null; token: string | null }> {
  const cookie = request.headers.get('Cookie') || ''
  const tokenMatch = cookie.match(/session=([a-f0-9]+)/)
  if (!tokenMatch) return { user: null, token: null }
  const token = tokenMatch[1]
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.email, u.role, u.avatar, u.bio, u.created_at
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .bind(token)
    .first<SessionUser>()
  if (!row) return { user: null, token: null }
  return { user: row, token }
}

export async function createSession(
  db: D1Database,
  userId: number
): Promise<string> {
  const token = randomHex(SESSION_BYTES)
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')
  await db
    .prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
    .bind(userId, token, expires)
    .run()
  return token
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export function sessionCookie(token: string): string {
  const maxAge = SESSION_TTL_DAYS * 86400
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

// Validation
export function validateUsername(name: string): string | null {
  if (!name) return '用户名不能为空'
  if (name.length < 3 || name.length > 20) return '用户名长度需为 3-20 个字符'
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return '用户名只能包含字母、数字和下划线'
  return null
}

export function validateEmail(email: string): string | null {
  if (!email) return '邮箱不能为空'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确'
  if (email.length > 120) return '邮箱过长'
  return null
}

export function validatePassword(pw: string): string | null {
  if (!pw) return '密码不能为空'
  if (pw.length < 8) return '密码至少 8 位'
  if (pw.length > 200) return '密码过长'
  return null
}

// Input sanitization for safe text fields
export function cleanText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLen)
}
