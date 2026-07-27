import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  type?: string
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export default function SEO({ title, description, type = 'website' }: SEOProps) {
  useEffect(() => {
    if (title) {
      document.title = `${title} - Marginalia`
    }
    if (description) {
      upsertMeta('description', description)
    }
    upsertMeta('og:title', title || 'Marginalia', 'property')
    upsertMeta('og:description', description || 'Marginalia — 随笔社区', 'property')
    upsertMeta('og:type', type, 'property')
    upsertMeta('og:site_name', 'Marginalia', 'property')
  }, [title, description, type])

  return null
}
