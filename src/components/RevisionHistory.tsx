import { useEffect, useState, useCallback } from 'react'
import {
  getPostRevisions,
  getRevision,
  restoreRevision,
  type Revision,
  type RevisionDetail,
} from '../api'

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFull(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'Z').toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

interface RevisionHistoryProps {
  postId: number
  open: boolean
  onClose: () => void
  onRestored?: () => void
}

export default function RevisionHistory({
  postId,
  open,
  onClose,
  onRestored,
}: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<RevisionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')

  const loadRevisions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getPostRevisions(postId)
      setRevisions(data)
      setSelectedId(data.length > 0 ? data[0].id : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史版本失败')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (open && postId) {
      loadRevisions()
    }
    if (!open) {
      setRevisions([])
      setSelectedId(null)
      setDetail(null)
      setError('')
      setDetailError('')
      setConfirmingId(null)
      setRestoreError('')
    }
  }, [open, postId, loadRevisions])

  useEffect(() => {
    if (!open || selectedId == null) {
      setDetail(null)
      return
    }
    let active = true
    setDetailLoading(true)
    setDetailError('')
    getRevision(postId, selectedId)
      .then((d) => {
        if (!active) return
        setDetail(d)
      })
      .catch((err) => {
        if (!active) return
        setDetailError(err instanceof Error ? err.message : '加载修订详情失败')
      })
      .finally(() => {
        if (!active) return
        setDetailLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, postId, selectedId])

  // ESC 键关闭
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && confirmingId == null && !restoring) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, confirmingId, restoring])

  async function handleRestore(id: number) {
    if (restoring) return
    setRestoring(true)
    setRestoreError('')
    try {
      await restoreRevision(postId, id)
      setConfirmingId(null)
      onRestored?.()
      onClose()
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : '恢复失败')
    } finally {
      setRestoring(false)
    }
  }

  if (!open) return null

  // 计算 diff 指标：相对前一条修订的内容长度变化
  function diffIndicator(index: number): { delta: number; label: string } | null {
    if (index >= revisions.length - 1) return null
    const prev = revisions[index + 1]
    const curr = revisions[index]
    const delta = curr.content_length - prev.content_length
    if (delta === 0) return { delta: 0, label: '无变化' }
    return {
      delta,
      label: delta > 0 ? `+${delta} 字` : `${delta} 字`,
    }
  }

  return (
    <div
      className="modal-overlay revision-history-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-history-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && confirmingId == null && !restoring) {
          onClose()
        }
      }}
    >
      <div className="modal revision-history">
        <header className="modal__header revision-history__header">
          <h2 className="modal__title" id="revision-history-title">
            历史版本
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="关闭"
            onClick={onClose}
            disabled={restoring}
          >
            ×
          </button>
        </header>

        <div className="revision-history__body">
          <aside className="revision-history__list" aria-label="版本列表">
            {loading && <div className="revision-history__hint">加载中…</div>}
            {!loading && error && (
              <div className="revision-history__hint revision-history__hint--error">
                {error}
              </div>
            )}
            {!loading && !error && revisions.length === 0 && (
              <div className="revision-history__hint">暂无历史版本</div>
            )}
            {!loading && !error && revisions.length > 0 && (
              <ul>
                {revisions.map((r, i) => {
                  const diff = diffIndicator(i)
                  const isSelected = r.id === selectedId
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`revision-item${isSelected ? ' revision-item--active' : ''}`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <div className="revision-item__time" title={formatFull(r.created_at)}>
                          {formatRelative(r.created_at)}
                        </div>
                        <div className="revision-item__title" title={r.title}>
                          {r.title_excerpt || '（无标题）'}
                        </div>
                        <div className="revision-item__meta">
                          <span className="revision-item__author">
                            @{r.author_username ?? '未知'}
                          </span>
                          <span className="revision-item__length">
                            {r.content_length} 字
                          </span>
                          {diff && (
                            <span
                              className={`revision-item__diff${
                                diff.delta > 0
                                  ? ' revision-item__diff--up'
                                  : diff.delta < 0
                                  ? ' revision-item__diff--down'
                                  : ''
                              }`}
                            >
                              {diff.label}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <section className="revision-history__preview" aria-label="版本预览">
            {detailLoading && <div className="revision-history__hint">加载中…</div>}
            {!detailLoading && detailError && (
              <div className="revision-history__hint revision-history__hint--error">
                {detailError}
              </div>
            )}
            {!detailLoading && !detailError && !detail && (
              <div className="revision-history__hint">
                选择左侧的某个版本以预览
              </div>
            )}
            {!detailLoading && !detailError && detail && (
              <>
                <div className="revision-preview__head">
                  <h3 className="revision-preview__title">{detail.title || '（无标题）'}</h3>
                  <div className="revision-preview__meta">
                    <span title={formatFull(detail.created_at)}>
                      {formatRelative(detail.created_at)}
                    </span>
                    <span className="revision-preview__meta-divider">·</span>
                    <span>@{detail.author_username ?? '未知'}</span>
                    <span className="revision-preview__meta-divider">·</span>
                    <span>{detail.content.length} 字</span>
                  </div>
                  {detail.excerpt && (
                    <p className="revision-preview__excerpt">{detail.excerpt}</p>
                  )}
                </div>
                <pre className="revision-preview__content">{detail.content}</pre>
              </>
            )}
          </section>
        </div>

        <footer className="modal__footer revision-history__footer">
          {restoreError && (
            <span className="revision-history__error">{restoreError}</span>
          )}
          {confirmingId != null ? (
            <>
              <span className="revision-history__confirm-text">
                恢复后当前内容会被自动保存为新版本，确认恢复？
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmingId(null)}
                disabled={restoring}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={() => handleRestore(confirmingId)}
                disabled={restoring}
              >
                {restoring ? '恢复中…' : '确认恢复'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={restoring}
              >
                关闭
              </button>
              <button
                type="button"
                className="btn-edit"
                onClick={() => setConfirmingId(selectedId)}
                disabled={!detail || restoring}
                title={detail ? '恢复此版本' : '请先选择一个版本'}
              >
                恢复此版本
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
