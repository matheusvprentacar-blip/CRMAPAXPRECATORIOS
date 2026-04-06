"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
)
const ICArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
)

interface StepFooterProps {
  onBack?: () => void
  onNext?: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  rightExtra?: ReactNode
}

export function StepFooter({
  onBack,
  onNext,
  backLabel = "Voltar",
  nextLabel = "Avançar",
  nextDisabled,
  nextLoading,
  rightExtra,
}: StepFooterProps) {
  const disabled = Boolean(nextDisabled || nextLoading)

  return (
    <div
      className="mt-6 pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      {/* left — back */}
      <div className="flex flex-wrap items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[13px] px-5 text-[13px] font-bold transition-all sm:w-auto"
            style={{
              background: "#f0f1f5",
              border: "1.5px solid rgba(0,0,0,0.07)",
              color: "#374151",
              boxShadow: "4px 4px 10px rgba(0,0,0,0.05),-2px -2px 6px rgba(255,255,255,0.9)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e8eaef" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f1f5" }}
          >
            <ICArrowLeft />
            {backLabel}
          </button>
        )}
      </div>

      {/* right — extra + next */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {rightExtra}
        {onNext && (
          <button
            type="button"
            onClick={disabled ? undefined : onNext}
            disabled={disabled}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[13px] px-6 text-[13px] font-bold transition-all sm:w-auto",
              disabled && "cursor-not-allowed opacity-50",
            )}
            style={{
              background: disabled ? "#9ca3af" : "#0e4d6a",
              border: "none",
              color: "#ffffff",
              boxShadow: disabled
                ? "none"
                : "8px 8px 20px rgba(14,77,106,0.42),-3px -3px 8px rgba(255,255,255,0.3),inset 1px 1px 3px rgba(255,255,255,0.14)",
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#1a6080" }}
            onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = "#0e4d6a" }}
          >
            {nextLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : null}
            {nextLabel}
            {!nextLoading ? <ICArrowRight /> : null}
          </button>
        )}
      </div>
    </div>
  )
}
