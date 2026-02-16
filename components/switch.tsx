"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as UISwitch, type SwitchProps } from "@/components/ui/switch"

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(({ className, ...props }, ref) => (
  <UISwitch ref={ref} data-slot="switch" className={className} {...props} />
))

Switch.displayName = "Switch"

type SwitchFieldProps = React.HTMLAttributes<HTMLDivElement>

function SwitchField({ className, ...props }: SwitchFieldProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-background/60 px-4 py-3",
        "[&>[data-slot='label']]:col-start-1 [&>[data-slot='label']]:row-start-1",
        "[&>[data-slot='description']]:col-start-1 [&>[data-slot='description']]:row-start-2",
        "[&>[data-slot='switch']]:col-start-2 [&>[data-slot='switch']]:row-start-1 [&>[data-slot='switch']]:row-span-2",
        className
      )}
      {...props}
    />
  )
}

export { Switch, SwitchField }
