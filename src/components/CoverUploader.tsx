import { useCallback, useRef, useState } from 'react'

interface CoverUploaderProps {
  value: string
  onChange: (url: string) => void
  onError?: (msg: string) => void
}

function compressImage(file: File, maxSize = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 canvas 上下文'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(dataUrl.split(',')[1])
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

export default function CoverUploader({ value, onChange, onError }: CoverUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const dragCounterRef = useRef(0)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（PNG / JPG / WebP 等）')
      onError?.('请选择图片文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB')
      onError?.('图片过大')
      return
    }

    setUploading(true)
    try {
      const base64 = await compressImage(file, 1280)
      const res = await fetch('/api/upload-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data?.url) {
        onChange(data.url)
      } else {
        throw new Error('返回数据格式异常')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败'
      setError(msg)
      onError?.(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [onChange, onError])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleUpload(file)
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setIsDragging(true)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleUpload(file)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          void handleUpload(file)
          break
        }
      }
    }
  }

  return (
    <div className="cover-uploader">
      <div
        className={`cover-dropzone ${isDragging ? 'cover-dropzone--dragging' : ''}${uploading ? ' cover-dropzone--uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        aria-label="拖拽或点击上传封面图"
      >
        {value && !uploading ? (
          <div className="cover-dropzone__preview-wrap">
            <img src={value} alt="封面预览" className="cover-dropzone__preview" />
            <div className="cover-dropzone__overlay">
              <span>点击替换</span>
            </div>
          </div>
        ) : (
          <>
            <span className="cover-dropzone__icon" aria-hidden="true">
              {uploading ? '⏳' : '🖼️'}
            </span>
            <div className="cover-dropzone__text">
              {uploading ? (
                <span className="cover-dropzone__uploading">正在上传…</span>
              ) : (
                <>
                  <span className="cover-dropzone__title">
                    {isDragging ? '松开鼠标即可上传' : '拖拽图片到此处，或点击选择文件'}
                  </span>
                  <span className="cover-dropzone__hint">
                    支持 PNG / JPG / WebP / GIF，自动压缩到 1280px，最大 10MB
                  </span>
                </>
              )}
            </div>
          </>
        )}
        {!uploading && value && (
          <button
            type="button"
            className="cover-dropzone__clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            title="移除封面图"
          >
            ✕
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={uploading}
      />

      {error && <div className="cover-dropzone__error">{error}</div>}
    </div>
  )
}
