import { useEffect, useState, type ReactNode } from 'react'
import api from '../lib/api'

// List endpoints leave embedded (data:) photos out to stay small — they only
// say one exists (`has`). This fetches it on demand, once per session.
// Keep in sync with igembe-dashboard/src/components/LazyImage.tsx.
const cache = new Map<string, Promise<string | null>>()

export function fetchImage(endpoint: string, field: 'photoUrl' | 'imageUrl'): Promise<string | null> {
  let p = cache.get(endpoint)
  if (!p) {
    p = api.get(endpoint)
      .then(r => (r.data?.data?.[field] as string) || null)
      .catch(() => { cache.delete(endpoint); return null })
    cache.set(endpoint, p)
  }
  return p
}

export default function LazyImage({ src, has, endpoint, field, className, alt = '', fallback }: {
  src?: string | null        // direct URL, when the list already includes it
  has?: boolean              // an embedded image exists and must be fetched
  endpoint: string           // e.g. /api/members/:id/photo
  field: 'photoUrl' | 'imageUrl'
  className?: string
  alt?: string
  fallback: ReactNode        // shown while loading, or when there is no image
}) {
  const [url, setUrl] = useState<string | null>(src || null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (src) { setUrl(src); return }
    setUrl(null)
    if (!has) return
    let alive = true
    fetchImage(endpoint, field).then(u => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [src, has, endpoint, field])

  if (!url || failed) return <>{fallback}</>
  return <img src={url} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
}
