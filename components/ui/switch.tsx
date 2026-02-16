"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  name?: string
  value?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      className,
      id,
      name,
      value = "on",
      required = false,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
    const isControlled = checked !== undefined
    const currentChecked = isControlled ? checked : internalChecked
    const dataState = currentChecked ? "checked" : "unchecked"

    const handleToggle = () => {
      if (disabled) return
      const next = !currentChecked
      if (!isControlled) {
        setInternalChecked(next)
      }
      onCheckedChange?.(next)
    }

    return (
      <>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={currentChecked}
          data-state={dataState}
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border/70 bg-muted/80 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            currentChecked ? "border-primary/60 bg-primary" : "bg-muted/80",
            className
          )}
          {...props}
        >
          <span
            data-state={dataState}
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-out",
              currentChecked ? "translate-x-[1.15rem]" : "translate-x-0.5"
            )}
          />
        </button>
        {name ? (
          <input
            type="checkbox"
            name={name}
            checked={currentChecked}
            onChange={() => {}}
            readOnly
            hidden
            value={value}
            required={required}
          />
        ) : null}
      </>
    )
  }
)

Switch.displayName = "Switch"
