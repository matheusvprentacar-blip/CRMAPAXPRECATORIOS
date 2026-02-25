"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

type SpotlightCardProps = {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "hsl(var(--primary) / 0.24)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return

    const rect = divRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    divRef.current.style.setProperty("--mouse-x", `${x}px`)
    divRef.current.style.setProperty("--mouse-y", `${y}px`)
    divRef.current.style.setProperty("--spotlight-color", spotlightColor)
  }

  const handleMouseLeave = () => {
    if (!divRef.current) return
    divRef.current.style.setProperty("--mouse-x", "-999px")
    divRef.current.style.setProperty("--mouse-y", "-999px")
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("card-spotlight", className)}
    >
      {children}
    </div>
  )
}

