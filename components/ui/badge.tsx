import * as React from "react"
import { Chip } from "@/lib/heroui/compat"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof badgeVariants> {}

function getChipVariant(variant: BadgeProps["variant"]): "solid" | "flat" | "bordered" {
  if (variant === "outline") return "bordered"
  if (variant === "secondary" || variant === "destructive") return "flat"
  return "solid"
}

function getChipColor(variant: BadgeProps["variant"]): "default" | "primary" | "danger" {
  if (variant === "destructive") return "danger"
  if (variant === "default") return "primary"
  return "default"
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <Chip
      radius="full"
      size="sm"
      variant={getChipVariant(variant)}
      color={getChipColor(variant)}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
