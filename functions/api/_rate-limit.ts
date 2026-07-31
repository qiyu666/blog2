// Rate limiting & brute-force protection helpers backed by D1.
//
// Two layers of protection:
//   1. Login attempts  — per-IP and per-identifier lockout after N failures
//   2. Admin API hits  — per-IP request cap for /api/admin/* endpoints
//
// Cloudflare already provides edge-level protection (WAF, rate limiting rules),
// but this is a defense-in-depth layer that works regardless of plan tier.

import { error } from './_helpers'

// ---- Tunables ----
const LOGIN_WINDOW_MIN = 15        // count failures within this window
const LOGIN_MAX_FAILURES = 5       // lock out after this many failures (per IP AND per identifier)
const LOGIN_LOCK_MIN = 30          // lockout duration

const ADMIN_WINDOW_MIN = 1         // admin API window
const ADMIN_MAX_HITS = 60          // max admin API requests per IP per window
const ADMIN_LOCK_MIN = 10          // admin API cool-off when over limit

const ADMIN_STRICT_WINDOW_MIN = 1  // stricter cap for unauthenticated admin probes
const ADMIN_STRICT_MAX_HITS = 10   // unauthenticated /api/admin/* calls per IP per minute
const ADMIN_STRICT_LOCK_MIN = 30   // long cool-off for admin probes

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSec: number
  reason?: string
}

function getCfIp(request: Request): string {
  // Cloudflare provides the originating client IP in CF-Connecting-IP.
  // Fall back to X-Forwarded-For / X-Real-IP for local dev or proxies.
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Real-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    '0.0.0.0'
  )
}

// ---------------- Login attempts ----------------

export async function recordLoginAttempt(
  db: D1Database,
  request: Request,
  identifier: string,
  success: boolean
): Promise<void> {
  const ip = getCfIp(request)
  await db
    .prepare(
      'INSERT INTO login_attempts (ip, identifier, success) VALUES (?, ?, ?)'
    )
    .bind(ip, identifier.toLowerCase(), success ? 1 : 0)
    .run()
}

/**
 * Decide whether a login attempt should be allowed based on prior failures.
 * Lockout triggers when EITHER the IP OR the identifier has too many recent failures.
 */
export async function checkLoginRateLimit(
  db: D1Database,
  request: Request,
  identifier: string
): Promise<RateLimitDecision> {
  const ip = getCfIp(request)
  const ident = identifier.toLowerCase()

  // Count recent failures per IP and per identifier within the window.
  const sinceIp = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM login_attempts
       WHERE ip = ? AND success = 0
         AND created_at > datetime('now', ?)`
    )
    .bind(ip, `-${LOGIN_WINDOW_MIN} minutes`)
    .first<{ c: number }>()

  const sinceIdent = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM login_attempts
       WHERE identifier = ? AND success = 0
         AND created_at > datetime('now', ?)`
    )
    .bind(ident, `-${LOGIN_WINDOW_MIN} minutes`)
    .first<{ c: number }>()

  const ipFailures = sinceIp?.c || 0
  const identFailures = sinceIdent?.c || 0

  if (ipFailures >= LOGIN_MAX_FAILURES || identFailures >= LOGIN_MAX_FAILURES) {
    return {
      allowed: false,
      retryAfterSec: LOGIN_LOCK_MIN * 60,
      reason:
        '登录失败次数过多，已暂时锁定。请稍后再试。' +
        `（IP: ${ipFailures}/${LOGIN_MAX_FAILURES}，账户: ${identFailures}/${LOGIN_MAX_FAILURES}）`,
    }
  }
  return { allowed: true, retryAfterSec: 0 }
}

/** Successful login: clear recent failures for this identifier (IP kept for monitoring). */
export async function clearLoginFailures(
  db: D1Database,
  request: Request,
  identifier: string
): Promise<void> {
  const ident = identifier.toLowerCase()
  await db
    .prepare('DELETE FROM login_attempts WHERE identifier = ? AND success = 0')
    .bind(ident)
    .run()
}

// Optional: opportunistic cleanup so the table does not grow forever.
export async function pruneLoginAttempts(db: D1Database): Promise<void> {
  await db
    .prepare(
      `DELETE FROM login_attempts WHERE created_at < datetime('now', '-24 hours')`
    )
    .run()
}

// ---------------- Admin API rate limiting ----------------

export interface AdminRateLimitOptions {
  /** When true, apply the stricter unauthenticated-probe cap. */
  authenticated: boolean
}

/**
 * Record + check admin API access. Two thresholds:
 *   - unauthenticated probes: very low cap (catches scanners hitting /api/admin/*)
 *   - authenticated requests:  higher cap (legitimate admin work)
 *
 * Call this BEFORE role checks so anonymous scanners are throttled hard.
 */
export async function checkAdminRateLimit(
  db: D1Database,
  request: Request,
  options: AdminRateLimitOptions
): Promise<RateLimitDecision> {
  const ip = getCfIp(request)
  const path = new URL(request.url).pathname

  await db
    .prepare('INSERT INTO admin_api_hits (ip, path) VALUES (?, ?)')
    .bind(ip, path)
    .run()

  const { maxHits, lockMin } = options.authenticated
    ? { maxHits: ADMIN_MAX_HITS, lockMin: ADMIN_LOCK_MIN }
    : { maxHits: ADMIN_STRICT_MAX_HITS, lockMin: ADMIN_STRICT_LOCK_MIN }

  const row = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM admin_api_hits
       WHERE ip = ? AND created_at > datetime('now', ?)`
    )
    .bind(ip, `-${ADMIN_STRICT_WINDOW_MIN} minutes`)
    .first<{ c: number }>()

  const hits = row?.c || 0
  if (hits > maxHits) {
    return {
      allowed: false,
      retryAfterSec: lockMin * 60,
      reason: '请求过于频繁，已暂时限制访问。',
    }
  }
  return { allowed: true, retryAfterSec: 0 }
}

/** Helper for admin endpoints: returns an error Response if rate-limited. */
export async function enforceAdminRateLimit(
  db: D1Database,
  request: Request,
  authenticated: boolean
): Promise<Response | null> {
  if (authenticated) {
    return null
  }
  const decision = await checkAdminRateLimit(db, request, { authenticated })
  if (!decision.allowed) {
    return error(decision.reason || '请求过于频繁', 429, {
      'Retry-After': String(decision.retryAfterSec),
    })
  }
  return null
}

export async function pruneAdminApiHits(db: D1Database): Promise<void> {
  await db
    .prepare(
      `DELETE FROM admin_api_hits WHERE created_at < datetime('now', '-1 hour')`
    )
    .run()
}

// ---------------- 通用写入限流 ----------------

// 写入操作（评论/点赞/收藏/举报）合并限流：每 IP 每分钟最多 30 次
const WRITE_WINDOW_MIN = 1
const WRITE_MAX_HITS = 30

/**
 * 通用写入限流：对评论/点赞/收藏/举报等写入操作按 IP 合并计数。
 * 复用 admin_api_hits 表，无需新建表。
 * 超限返回 429，否则返回 null。
 */
export async function enforceWriteRateLimit(
  db: D1Database,
  request: Request
): Promise<Response | null> {
  const ip = getCfIp(request)
  const path = new URL(request.url).pathname

  // 记录本次写入请求
  await db
    .prepare('INSERT INTO admin_api_hits (ip, path) VALUES (?, ?)')
    .bind(ip, path)
    .run()

  // 统计该 IP 在窗口内的写入次数
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM admin_api_hits
       WHERE ip = ? AND created_at > datetime('now', ?)`
    )
    .bind(ip, `-${WRITE_WINDOW_MIN} minutes`)
    .first<{ c: number }>()

  const hits = row?.c || 0
  if (hits > WRITE_MAX_HITS) {
    return error('操作过于频繁，请稍后再试', 429, { 'Retry-After': '60' })
  }
  return null
}

// Exported for tests / status reporting
export const __tunables = {
  LOGIN_WINDOW_MIN,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCK_MIN,
  ADMIN_MAX_HITS,
  ADMIN_STRICT_MAX_HITS,
}
