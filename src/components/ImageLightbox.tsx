import { useEffect, useState, useCallback } from 'react'

export interface LightboxImage {
  src: string
  alt: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  index: number
  open: boolean
  onClose: () => void
  onIndexChange: (index: number) => void
}

export default function ImageLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const current = images[index]
  const hasMultiple = images.length > 1

  const resetView = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    resetView()
    onIndexChange((index - 1 + images.length) % images.length)
  }, [hasMultiple, images.length, index, onIndexChange, resetView])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    resetView()
    onIndexChange((index + 1) % images.length)
  }, [hasMultiple, images.length, index, onIndexChange, resetView])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, goPrev, goNext])

  // 切换图片时重置缩放
  useEffect(() => {
    resetView()
  }, [index, resetView])

  // 打开时锁定滚动
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !current) return null

  const caption = current.alt

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={(e) => {
        // 点击背景（非图片/按钮）关闭
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="lightbox__backdrop" onClick={onClose} />

      <button
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="关闭"
        title="关闭 (ESC)"
      >
        ✕
      </button>

      <div className="lightbox__stage">
        <img
          src={current.src}
          alt={caption}
          className="lightbox__img"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
          draggable={false}
        />
      </div>

      <div className="lightbox__caption">
        {caption && <span className="lightbox__caption-text">{caption}</span>}
        {hasMultiple && (
          <span className="lightbox__counter">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      <div className="lightbox__controls">
        <button
          type="button"
          className="lightbox__btn lightbox__btn--nav"
          onClick={goPrev}
          disabled={!hasMultiple}
          aria-label="上一张"
          title="上一张 (←)"
        >
          ‹
        </button>
        <button
          type="button"
          className="lightbox__btn lightbox__btn--zoom"
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          disabled={zoom <= 1}
          aria-label="缩小"
          title="缩小"
        >
          −
        </button>
        <span className="lightbox__zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="lightbox__btn lightbox__btn--zoom"
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          disabled={zoom >= 4}
          aria-label="放大"
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          className="lightbox__btn lightbox__btn--reset"
          onClick={resetView}
          disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
          aria-label="重置"
          title="重置"
        >
          ⤾
        </button>
        <button
          type="button"
          className="lightbox__btn lightbox__btn--nav"
          onClick={goNext}
          disabled={!hasMultiple}
          aria-label="下一张"
          title="下一张 (→)"
        >
          ›
        </button>
      </div>
    </div>
  )
}
