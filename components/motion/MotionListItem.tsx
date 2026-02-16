"use client"

import type React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MOTION } from "@/lib/motion"

export function MotionListItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 1 } : MOTION.item.initial}
      animate={reduce ? { opacity: 1 } : MOTION.item.animate}
      exit={reduce ? { opacity: 1 } : MOTION.item.exit}
      transition={{ duration: MOTION.dur.ui, ease: MOTION.ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
