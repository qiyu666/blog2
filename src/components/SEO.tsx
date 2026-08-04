import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  type?: string
}

/** Attribute used to mark meta/script tags that were created or updated
 *  dynamically by the SPA, so they can be cleaned up on unmount. */
const DYNAMIC_ATTR = 'data-dynamic'

/**
 * Create or update a <meta> tag in <head>.
 * @param name     meta name (e.g. "twitter:card") or property (e.g. "og:title")
 * @param content  content value
 * @param isProperty when true, use the `property` attribute (OG tags); otherwise `name`
 */
export function setMetaTag(name: string, content: string, isProperty = false) {
  if (!content) return
  const attr = isProperty ? 'property' : 'name'
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  el.setAttribute(DYNAMIC_ATTR, 'true')
}

/**
 * Create or update a single JSON-LD <script type="application/ld+json"> tag
 * containing the serialized `data` object.
 */
export function setJsonLd(data: unknown) {
  let el = document.head.querySelector<HTMLScriptElement>(
    `script[type="application/ld+json"][${DYNAMIC_ATTR}="true"]`,
  )
  if (!el) {
    el = document.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    el.setAttribute(DYNAMIC_ATTR, 'true')
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * Remove every meta tag and JSON-LD script previously marked as dynamic.
 * Call this on component unmount so page-specific SEO tags don't bleed
 * into other routes.
 */
export function cleanupDynamicMeta() {
  document.head
    .querySelectorAll(`meta[${DYNAMIC_ATTR}="true"], script[${DYNAMIC_ATTR}="true"]`)
    .forEach((el) => el.remove())
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return
  setMetaTag(name, content, attr === 'property')
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
