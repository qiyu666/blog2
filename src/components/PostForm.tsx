import { useState } from 'react';
import type { PostInput } from '../types';

interface Props {
  initial?: Partial<PostInput>;
  onSubmit: (data: PostInput) => Promise<void>;
  submitLabel: string;
}

const CATEGORIES = ['Essays', 'Technology', 'Culture', 'Photography', 'General'];

export default function PostForm({ initial, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<PostInput>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? 'Essays',
    tags: initial?.tags ?? '',
    cover_image: initial?.cover_image ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="form__error">{error}</div>}
      <div className="form__field">
        <label className="form__label">标题</label>
        <input
          className="form__input"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="给你的帖子起个标题…"
          required
        />
      </div>
      <div className="form__field">
        <label className="form__label">摘要</label>
        <textarea
          className="form__textarea"
          value={form.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          placeholder="出现在列表里的简短摘要（留空将自动截取）"
          rows={2}
        />
      </div>
      <div className="form__row">
        <div className="form__field">
          <label className="form__label">分类</label>
          <select
            className="form__select"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label">标签（逗号分隔）</label>
          <input
            className="form__input"
            value={form.tags}
            onChange={(e) => update('tags', e.target.value)}
            placeholder="reading, books"
          />
        </div>
      </div>
      <div className="form__field">
        <label className="form__label">封面图 URL</label>
        <input
          className="form__input"
          value={form.cover_image}
          onChange={(e) => update('cover_image', e.target.value)}
          placeholder="https://images.unsplash.com/..."
        />
      </div>
      <div className="form__field">
        <label className="form__label">正文（支持 Markdown）</label>
        <textarea
          className="form__textarea form__textarea--content"
          value={form.content}
          onChange={(e) => update('content', e.target.value)}
          placeholder="# 你的故事从这里开始…"
          required
        />
      </div>
      <div className="form__actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '保存中…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
