"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export type KpiMetric = {
  label: string
  value: string | number
  sub: string
}

type KpiCardProps = {
  metrics: KpiMetric[]
  interval?: number
  colors: {
    bg: string
    border: string
    label: string
    value: string
    sub: string
    dot: string
  }
  className?: string
}

export function KpiCard({ metrics, interval = 4000, colors, className = "" }: KpiCardProps) {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(false)

  const advance = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setActive((i) => (i + 1) % metrics.length)
      setVisible(true)
    }, 250)
  }, [metrics.length])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) advance()
    }, interval)
  }, [advance, interval])

  useEffect(() => {
    if (metrics.length <= 1) return
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [metrics.length, startTimer])

  // Reset ao trocar métricas (ex: filtro muda)
  useEffect(() => {
    setActive(0)
    setVisible(true)
  }, [metrics])

  const current = metrics[active] ?? metrics[0]

  return (
    <article
      className={`px-3 py-2.5 rounded-2xl select-none ${className}`}
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        boxShadow: "8px 8px 18px rgba(0,0,0,.06),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.9),inset -1px -1px 2px rgba(0,0,0,.02)",
      }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <span
        className="block text-[8.5px] font-black uppercase tracking-[0.16em] truncate"
        style={{ color: colors.label }}
      >
        {current.label}
      </span>

      <div
        className="mt-1.5 font-black leading-none tracking-[-0.04em] truncate"
        style={{
          color: colors.value,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
          fontSize: String(current.value).length > 14 ? "13px" : String(current.value).length > 10 ? "16px" : "22px",
        }}
      >
        {current.value}
      </div>

      <div
        className="mt-1 text-[10px] truncate"
        style={{ color: colors.sub, opacity: visible ? 0.7 : 0, transition: "opacity 0.25s ease" }}
      >
        {current.sub}
      </div>

      {metrics.length > 1 && (
        <div className="flex items-center gap-[3px] mt-1.5">
          {metrics.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); setVisible(true); startTimer() }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? "12px" : "5px",
                height: "5px",
                background: i === active ? colors.dot : colors.border,
                opacity: i === active ? 1 : 0.5,
              }}
              aria-label={`Métrica ${i + 1}`}
            />
          ))}
        </div>
      )}
    </article>
  )
}
