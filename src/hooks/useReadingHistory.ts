import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'marginalia:reading-history'
const MAX_ITEMS = 50

export interface ReadingHistoryItem {
  slug: string
  title: string
  excerpt: string
  cover_image?: string
  author_username?: string
  visited_at: number // timestamp
  read_progress?: number // 0-100
}

export function load(): ReadingHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(items: ReadingHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // localStorage 可能被禁用或满
  }
}

/** 阅读历史：基于 localStorage 的轻量级"已读"记录 */
export function useReadingHistory() {
  const [history, setHistory] = useState<ReadingHistoryItem[]>([])

  useEffect(() => {
    setHistory(load())
  }, [])

  const recordVisit = useCallback((item: Omit<ReadingHistoryItem, 'visited_at'>) => {
    setHistory((prev) => {
      const filtered = prev.filter((i) => i.slug !== item.slug)
      const next = [{ ...item, visited_at: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
      save(next)
      return next
    })
  }, [])

  const updateProgress = useCallback((slug: string, read_progress: number) => {
    setHistory((prev) => {
      const idx = prev.findIndex((i) => i.slug === slug)
      if (idx < 0) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], read_progress }
      save(next)
      return next
    })
  }, [])

  const isRead = useCallback(
    (slug: string) => history.some((i) => i.slug === slug),
    [history]
  )

  const remove = useCallback((slug: string) => {
    setHistory((prev) => {
      const next = prev.filter((i) => i.slug !== slug)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setHistory([])
  }, [])

  return { history, recordVisit, updateProgress, isRead, remove, clear }
}
