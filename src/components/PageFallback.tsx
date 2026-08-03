/** Suspense fallback：路由级懒加载时显示的占位 */
export default function PageFallback() {
  return (
    <div className="loading" style={{ minHeight: '60vh' }}>
      加载中…
    </div>
  )
}
