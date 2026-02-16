"use client"

import type React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MOTION } from "@/lib/motion"

export function DetailSection({
  title,
  children,
  className = "",
}: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <motion.section
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: MOTION.dur.ui, ease: MOTION.ease }}
      className={`rounded-2xl border bg-background p-4 shadow-sm ${className}`}
    >
      {title ? <div className="mb-2 text-sm font-medium opacity-80">{title}</div> : null}
      {children}
    </motion.section>
  )
}
