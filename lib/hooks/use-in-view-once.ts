"use client"

import { useEffect, useRef, useState } from "react"

type UseInViewOnceOptions = {
  threshold?: number
  rootMargin?: string
}

export function useInViewOnce<T extends HTMLElement>({
  threshold = 0.2,
  rootMargin = "0px",
}: UseInViewOnceOptions = {}) {
  const ref = useRef<T | null>(null)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (hasEntered) return

    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === "undefined") {
      setHasEntered(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEntered(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasEntered, rootMargin, threshold])

  return { ref, hasEntered }
}
