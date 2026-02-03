"use client"

import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const isNextDisabled = Boolean(nextDisabled || nextLoading)

  return (
    <div className="mt-6 border-t border-border/60 pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {onBack && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl border border-border/70 bg-transparent text-foreground/90 hover:bg-muted/20 transition sm:w-auto"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {rightExtra}
        {onNext && (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className={cn(
              "h-11 w-full rounded-xl px-6 font-semibold transition-all duration-200 ease-out sm:w-auto",
              "bg-primary text-primary-foreground shadow-md shadow-black/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              !isNextDisabled && "hover:brightness-110 hover:shadow-lg active:scale-[0.98]",
              isNextDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="flex items-center gap-2">
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}
