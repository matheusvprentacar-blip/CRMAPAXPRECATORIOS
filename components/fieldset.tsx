"use client"

import * as React from "react"
import { Label as UILabel } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  React.ElementRef<typeof UILabel>,
  React.ComponentPropsWithoutRef<typeof UILabel>
>(({ className, ...props }, ref) => (
  <UILabel
    ref={ref}
    data-slot="label"
    className={cn("text-sm font-medium text-foreground", className)}
    {...props}
  />
))

Label.displayName = "FieldsetLabel"

const Description = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
)

Description.displayName = "FieldsetDescription"

export { Label, Description }
