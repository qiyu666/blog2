import { useState, useEffect, useRef } from 'react';
import type { PostInput } from '../types';
import MarkdownEditor from './MarkdownEditor';

interface Props {
  initial?: Partial<PostInput>;
  onSubmit: (data: PostInput) => Promise<void>;
  submitLabel: string;
  editingId?: number;
}

const CATEGORIES = ['随笔', '技术', '文化', '摄影', '综合'];

// 预设自定义脚本示例
const PRESET_BG_GRADIENT = `// 渐变背景动画 — 为文章添加流动的渐变背景
(function() {
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;opacity:0.15;';
  bg.style.background = 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)';
  bg.style.backgroundSize = '400% 400%';
  bg.style.animation = 'gradientBG 15s ease infinite';
  document.body.appendChild(bg);
  var style = document.createElement('style');
  style.textContent = '@keyframes gradientBG { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }';
  document.head.appendChild(style);
})();`;

const PRESET_SNOW = `// 飘雪特效 — 文章页飘落的雪花
(function() {
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var flakes = [];
  for (var i = 0; i < 60; i++) {
    flakes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 3 + 1, s: Math.random() + 0.5 });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      f.y += f.s;
      f.x += Math.sin(f.y * 0.01) * 0.5;
      if (f.y > canvas.height) { f.y = -10; f.x = Math.random() * canvas.width; }
    }
    ctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();`;

const PRESET_MUSIC = `/*MUSIC_PLAYER*/
[
  {"title": "歌曲名称1", "url": "https://example.com/music1.mp3"},
  {"title": "歌曲名称2", "url": "https://example.com/music2.mp3"},
  {"title": "歌曲名称3", "url": "https://example.com/music3.mp3"}
]
/*END*/
// 使用说明：修改上面的歌曲名和链接即可，播放器会自动渲染。
// 如果只想用一首歌，只保留一行即可。
// 也可以完全删除以上内容，自己写自定义 JS。`;

const PRESET_TYPING = `// 打字机效果 — 文章标题逐字显示
(function() {
  var title = document.querySelector('.article__title');
  if (!title) return;
  var text = title.textContent;
  title.textContent = '';
  title.style.borderRight = '2px solid var(--accent)';
  var i = 0;
  function type() {
    if (i < text.length) {
      title.textContent += text.charAt(i);
      i++;
      setTimeout(type, 80);
    } else {
      setInterval(function() {
        title.style.borderRightColor = title.style.borderRightColor === 'transparent' ? 'var(--accent)' : 'transparent';
      }, 500);
    }
  }
  setTimeout(type, 500);
})();`;

interface DraftData {
  form: PostInput;
  savedAt: number;
}

function draftKey(editingId?: number) {
  return `post-draft-${editingId || 'new'}`;
}

export default function PostForm({ initial, onSubmit, submitLabel, editingId }: Props) {
  const [form, setForm] = useState<PostInput>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? '随笔',
    tags: initial?.tags ?? '',
    cover_image: initial?.cover_image ?? '',
    published: initial?.published ?? 1,
    custom_js: initial?.custom_js ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [savedHintVisible, setSavedHintVisible] = useState(false);
  const [showCustomJs, setShowCustomJs] = useState(!!initial?.custom_js);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // On mount: check for a saved draft.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(editingId));
      if (!raw) return;
      const draft: DraftData = JSON.parse(raw);
      if (editingId) {
        // Editing: silently restore if a local draft exists (it is newer
        // than the freshly-loaded server data).
        setForm(draft.form);
      } else {
        // New post: ask the user before restoring.
        setShowDraftBanner(true);
      }
    } catch {
      // ignore malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save (skip the very first run so we don't overwrite an
  // existing draft with the initial form state before the user edits).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const data: DraftData = { form, savedAt: Date.now() };
        localStorage.setItem(draftKey(editingId), JSON.stringify(data));
        setSavedHintVisible(true);
        if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current);
        savedHintTimerRef.current = setTimeout(() => setSavedHintVisible(false), 2000);
      } catch {
        // ignore quota / serialization errors
      }
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, editingId]);

  // Cleanup saved-hint timer on unmount.
  useEffect(() => {
    return () => {
      if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current);
    };
  }, []);

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey(editingId));
      if (raw) {
        const draft: DraftData = JSON.parse(raw);
        setForm(draft.form);
      }
    } catch {
      // ignore
    }
    setShowDraftBanner(false);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(editingId));
    } catch {
      // ignore
    }
    setShowDraftBanner(false);
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
      // Clear the draft after a successful submit.
      try {
        localStorage.removeItem(draftKey(editingId));
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {showDraftBanner && (
        <div className="form__draft-banner">
          <span>检测到未保存的草稿，是否恢复？</span>
          <button type="button" className="form__draft-btn" onClick={restoreDraft}>
            恢复
          </button>
          <button
            type="button"
            className="form__draft-btn form__draft-btn--ghost"
            onClick={discardDraft}
          >
            丢弃
          </button>
        </div>
      )}
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
            placeholder="阅读, 书籍"
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
        <MarkdownEditor
          value={form.content}
          onChange={(v) => update('content', v)}
          placeholder="# 你的故事从这里开始…"
          minHeight={420}
        />
      </div>
      <div className="form__field">
        <label className="form__label">发布状态</label>
        <div className="form__radio-group">
          <label className="form__radio">
            <input
              type="radio"
              name="published"
              checked={form.published !== 0}
              onChange={() => update('published', 1)}
            />
            <span>发布</span>
          </label>
          <label className="form__radio">
            <input
              type="radio"
              name="published"
              checked={form.published === 0}
              onChange={() => update('published', 0)}
            />
            <span>存为草稿</span>
          </label>
        </div>
      </div>

      {/* Custom JS — optional per-article scripting */}
      <div className="form__field form__custom-js">
        <div className="form__custom-js-toggle">
          <label className="form__label" style={{ marginBottom: 0 }}>
            自定义脚本
          </label>
          <button
            type="button"
            className="form__custom-js-btn"
            onClick={() => setShowCustomJs(!showCustomJs)}
          >
            {showCustomJs ? '收起' : '展开'}
          </button>
        </div>
        <p className="form__custom-js-hint">
          为这篇文章添加自定义 JavaScript，可以实现背景特效、背景音乐、互动元素等。
          脚本仅在文章详情页执行，作用域为整个页面。
        </p>
        {showCustomJs && (
          <>
            <div className="form__custom-js-presets">
              <button
                type="button"
                className="form__preset-btn"
                onClick={() => update('custom_js', PRESET_BG_GRADIENT)}
                title="渐变背景动画"
              >
                渐变背景
              </button>
              <button
                type="button"
                className="form__preset-btn"
                onClick={() => update('custom_js', PRESET_SNOW)}
                title="飘雪特效"
              >
                飘雪特效
              </button>
              <button
                type="button"
                className="form__preset-btn"
                onClick={() => update('custom_js', PRESET_MUSIC)}
                title="背景音乐播放器"
              >
                背景音乐
              </button>
              <button
                type="button"
                className="form__preset-btn"
                onClick={() => update('custom_js', PRESET_TYPING)}
                title="打字机效果"
              >
                打字机效果
              </button>
              <button
                type="button"
                className="form__preset-btn"
                onClick={() => update('custom_js', '')}
                title="清空"
              >
                清空
              </button>
            </div>
            <textarea
              className="form__textarea form__textarea--code"
              value={form.custom_js || ''}
              onChange={(e) => update('custom_js', e.target.value)}
              placeholder="// 在这里写 JavaScript 代码…&#10;// 例如：改变背景颜色、添加音乐播放器等&#10;// document.body.style.background = 'linear-gradient(...)'"
              rows={12}
              spellCheck={false}
            />
            <div className="form__custom-js-info">
              <span>支持原生 JavaScript · 限制 20KB · 仅在文章页执行</span>
              <span>{(form.custom_js || '').length} / 20000 字符</span>
            </div>
          </>
        )}
      </div>

      <div className="form__actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '保存中…' : submitLabel}
        </button>
        <span
          className={`form__saved-hint${savedHintVisible ? ' form__saved-hint--visible' : ''}`}
        >
          已自动保存
        </span>
      </div>
    </form>
  );
}
