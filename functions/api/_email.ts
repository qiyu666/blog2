// Queue an email notification to be sent later
// In production, this would be processed by a cron worker
// For now, we store in the email_queue table

export async function queueEmail(
  db: D1Database,
  userId: number,
  toEmail: string,
  subject: string,
  body: string
): Promise<void> {
  try {
    await db
      .prepare('INSERT INTO email_queue (user_id, to_email, subject, body) VALUES (?, ?, ?, ?)')
      .bind(userId, toEmail, subject, body)
      .run()
  } catch {
    // best-effort, don't fail the main operation
  }
}

// Check if user has email notifications enabled
// For now, all users with valid emails get notifications
// This could be extended with a user preference setting
export async function getUserEmail(db: D1Database, userId: number): Promise<string | null> {
  const row = await db
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>()
  return row?.email || null
}
