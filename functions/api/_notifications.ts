// Notification helper — fire-and-forget inserts into the notifications table.
// Callers should `void notify(...)` so a notification failure never breaks
// the primary request.

export type NotificationType =
  | 'comment_reply'   // someone replied to my comment
  | 'post_comment'    // someone commented on my post
  | 'like'            // someone liked my post
  | 'comment_like'    // someone liked my comment
  | 'favorite'        // someone favorited my post
  | 'follow'          // someone followed me
  | 'message'         // someone sent me a站内信
  | 'system'          // system announcement

export interface NotifyInput {
  db: D1Database
  userId: number          // recipient
  actorId?: number | null // who triggered it
  type: NotificationType
  postId?: number | null
  commentId?: number | null
  messageId?: number | null
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    // Never notify yourself to yourself
    if (input.actorId && input.actorId === input.userId) return
    await input.db
      .prepare(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.userId,
        input.actorId ?? null,
        input.type,
        input.postId ?? null,
        input.commentId ?? null,
        input.messageId ?? null
      )
      .run()

    // Queue email notification
    try {
      const userRow = await input.db
        .prepare('SELECT email FROM users WHERE id = ?')
        .bind(input.userId)
        .first<{ email: string }>()
      if (userRow?.email && !userRow.email.includes('@users.noreply.github.com')) {
        const actorRow = input.actorId
          ? await input.db.prepare('SELECT username FROM users WHERE id = ?').bind(input.actorId).first<{ username: string }>()
          : null
        const actorName = actorRow?.username || '系统'

        let subject = '你有新的通知'
        let body = ''

        switch (input.type) {
          case 'comment_reply':
            subject = `${actorName} 回复了你的评论`
            body = `${actorName} 回复了你的评论。查看详情：${input.postId ? '/post/' + input.postId : ''}`
            break
          case 'post_comment':
            subject = `${actorName} 评论了你的帖子`
            body = `${actorName} 评论了你的帖子。查看详情：${input.postId ? '/post/' + input.postId : ''}`
            break
          case 'like':
            subject = `${actorName} 赞了你的帖子`
            body = `${actorName} 赞了你的帖子。`
            break
          case 'comment_like':
            subject = `${actorName} 赞了你的评论`
            body = `${actorName} 赞了你的评论。查看：${input.postId ? '/post/' + input.postId : ''}`
            break
          case 'favorite':
            subject = `${actorName} 收藏了你的帖子`
            body = `${actorName} 收藏了你的帖子。`
            break
          case 'follow':
            subject = `${actorName} 关注了你`
            body = `${actorName} 关注了你。`
            break
          case 'message':
            subject = `${actorName} 给你发了一封站内信`
            body = `${actorName} 给你发了一封站内信。查看：/mailbox`
            break
          case 'system':
            subject = `你被 ${actorName} 提及了`
            body = `${actorName} 在评论中提及了你。查看：${input.postId ? '/post/' + input.postId : ''}`
            break
        }

        await input.db
          .prepare('INSERT INTO email_queue (user_id, to_email, subject, body) VALUES (?, ?, ?, ?)')
          .bind(input.userId, userRow.email, subject, body)
          .run()
      }
    } catch {
      // best-effort
    }
  } catch {
    // notifications are best-effort
  }
}
