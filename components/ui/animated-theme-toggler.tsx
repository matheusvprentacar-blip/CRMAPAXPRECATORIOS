"use client"

import { useCallback, useRef, useState, useEffect, type ComponentPropsWithoutRef } from "react"
import { flushSync } from "react-dom"
import { Moon, Sun } from "@/components/icons"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

export interface AnimatedThemeTogglerProps extends ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [mounted])

  const toggleTheme = useCallback(async () => {
    const nextTheme = isDark ? "light" : "dark"
    const documentWithViewTransition = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> }
    }

    if (!buttonRef.current || !documentWithViewTransition.startViewTransition) {
      setTheme(nextTheme)
      setIsDark(!isDark)
      return
    }

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = documentWithViewTransition.startViewTransition(() => {
      flushSync(() => {
        setIsDark(!isDark)
        setTheme(nextTheme)
      })
    })

    await transition.ready

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }, [duration, isDark, setTheme])

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(className)}
        {...props}
      >
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
