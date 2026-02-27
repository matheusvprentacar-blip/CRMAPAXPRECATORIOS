import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Button as HeroButton, Tooltip } from "@heroui/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  tooltip?: React.ReactNode
  tooltipPlacement?: "top" | "right" | "bottom" | "left"
  tooltipDelay?: number
}

function getHeroVariant(
  variant: ButtonProps["variant"]
): "solid" | "bordered" | "ghost" | "flat" | "light" {
  if (variant === "outline") return "bordered"
  if (variant === "ghost") return "ghost"
  if (variant === "secondary") return "flat"
  if (variant === "link") return "light"
  return "solid"
}

function getHeroColor(
  variant: ButtonProps["variant"]
): "default" | "primary" | "danger" {
  if (variant === "destructive") return "danger"
  if (variant === "default" || variant === "link") return "primary"
  return "default"
}

function getHeroSize(size: ButtonProps["size"]): "sm" | "md" | "lg" {
  if (size === "sm") return "sm"
  if (size === "lg") return "lg"
  return "md"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      tooltip,
      tooltipPlacement = "right",
      tooltipDelay = 0,
      ...props
    },
    ref
  ) => {
    const resolvedClassName = cn(buttonVariants({ variant, size, className }))

    const withTooltip = (content: React.ReactElement) => {
      if (!tooltip) return content

      return (
        <Tooltip delay={tooltipDelay}>
          {content}
          <Tooltip.Content showArrow placement={tooltipPlacement}>
            <Tooltip.Arrow />
            <p>{tooltip}</p>
          </Tooltip.Content>
        </Tooltip>
      )
    }

    if (asChild) {
      return withTooltip(
        <Slot className={resolvedClassName} ref={ref} {...props} />
      )
    }

    const heroProps = props as Omit<
      React.ComponentProps<typeof HeroButton>,
      "variant" | "size" | "color" | "className" | "isIconOnly"
    >

    return withTooltip(
      <HeroButton
        ref={ref}
        variant={getHeroVariant(variant)}
        color={getHeroColor(variant)}
        size={getHeroSize(size)}
        isIconOnly={size === "icon"}
        className={resolvedClassName}
        {...heroProps}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
