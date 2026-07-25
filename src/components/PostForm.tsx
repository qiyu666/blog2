import { useState } from 'react'
import type { PostInput } from '../types'

interface Props {
  initial?: Partial<PostInput>
  onSubmit: (data: PostInput) => Promise<void>
  submitLabel: string
}

const CATEGORIES = ['Essays', 'Technology', 'Culture', 'Photography', 'General']

export default function PostForm({ initial, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<PostInput>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    author: initial?.author ?? '',
    category: initial?.category ?? 'Essays',
    tags: initial?.tags ?? '',
    cover_image: initial?.cover_image ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{error}</p>}
      <div className="form__field">
        <label className="form__label">Title</label>
        <input
          className="form__input"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="Give your piece a title..."
          required
        />
      </div>
      <div className="form__field">
        <label className="form__label">Excerpt</label>
        <textarea
          className="form__textarea"
          value={form.excerpt}
          onChange={e => update('excerpt', e.target.value)}
          placeholder="A short summary that appears in the post list..."
          rows={2}
        />
      </div>
      <div className="form__row">
        <div className="form__field">
          <label className="form__label">Author</label>
          <input
            className="form__input"
            value={form.author}
            onChange={e => update('author', e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="form__field">
          <label className="form__label">Category</label>
          <select
            className="form__select"
            value={form.category}
            onChange={e => update('category', e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form__field">
        <label className="form__label">Tags (comma-separated)</label>
        <input
          className="form__input"
          value={form.tags}
          onChange={e => update('tags', e.target.value)}
          placeholder="reading, books, mindfulness"
        />
      </div>
      <div className="form__field">
        <label className="form__label">Cover Image URL</label>
        <input
          className="form__input"
          value={form.cover_image}
          onChange={e => update('cover_image', e.target.value)}
          placeholder="https://images.unsplash.com/..."
        />
      </div>
      <div className="form__field">
        <label className="form__label">Content (Markdown)</label>
        <textarea
          className="form__textarea form__textarea--content"
          value={form.content}
          onChange={e => update('content', e.target.value)}
          placeholder="# Your story begins here..."
          required
        />
      </div>
      <div className="form__actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
