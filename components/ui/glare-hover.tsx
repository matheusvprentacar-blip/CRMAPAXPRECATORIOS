"use client"

import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type GlareHoverProps = {
  children: ReactNode
  className?: string
  glareColor?: string
  glareOpacity?: number
  glareAngle?: number
  glareSize?: number
  transitionDuration?: number
  playOnce?: boolean
}

export default function GlareHover({
  children,
  className,
  glareColor = "#ffffff",
  glareOpacity = 0.3,
  glareAngle = -30,
  glareSize = 300,
  transitionDuration = 800,
  playOnce = false,
}: GlareHoverProps) {
  const [active, setActive] = useState(false)
  const [animate, setAnimate] = useState(true)
  const [hasPlayed, setHasPlayed] = useState(false)

  const canPlay = !playOnce || !hasPlayed

  const start = () => {
    if (!canPlay) return
    setAnimate(true)
    setActive(true)
    if (playOnce) setHasPlayed(true)
  }

  const stop = () => {
    // Reset sem animação ao sair para evitar o efeito de "volta".
    setAnimate(false)
    setActive(false)
  }

  const glareStyle = useMemo<CSSProperties>(
    () => ({
      width: `${glareSize}px`,
      opacity: glareOpacity,
      background: `linear-gradient(90deg, transparent 0%, ${glareColor} 50%, transparent 100%)`,
      transform: `translate(-50%, -50%) rotate(${glareAngle}deg) translateX(${active ? "140%" : "-140%"})`,
      transition: animate
        ? `transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : "none",
      willChange: "transform",
    }),
    [active, animate, glareAngle, glareColor, glareOpacity, glareSize, transitionDuration],
  )

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocusCapture={start}
      onBlurCapture={stop}
    >
      <div className="relative z-10">{children}</div>

      <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
        <span className="absolute left-1/2 top-1/2 h-[260%]" style={glareStyle} />
      </span>
    </div>
  )
}
