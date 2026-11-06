import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Shrinks its content to fit the available width without changing the
 * content's own layout. The dictionary page stays 720px wide, so the exported
 * PNG is the same on every device; only the on-screen preview is scaled.
 */
export function FitToWidth({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, height: 0 })

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner || typeof ResizeObserver === 'undefined') return
    const update = () => {
      // offsetWidth/offsetHeight ignore transforms, so this is the natural size.
      const natural = inner.offsetWidth
      const scale = natural > 0 ? Math.min(1, outer.clientWidth / natural) : 1
      setFit((current) => {
        const height = inner.offsetHeight * scale
        return current.scale === scale && current.height === height ? current : { scale, height }
      })
    }
    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(inner)
    update()
    return () => observer.disconnect()
  }, [])

  const scaled = fit.scale < 1
  return (
    <div ref={outerRef} className="w-full" style={scaled ? { height: fit.height } : undefined}>
      <div
        ref={innerRef}
        className="w-max origin-top-left"
        style={scaled ? { transform: `scale(${fit.scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
