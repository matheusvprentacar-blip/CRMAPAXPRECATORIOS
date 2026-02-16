"use client"

import type React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MOTION } from "@/lib/motion"

export function MotionCard({
  children,
  className = "",
  disableHover = false,
}: {
  children: React.ReactNode
  className?: string
  disableHover?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      layout={!reduce}
      whileHover={reduce || disableHover ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ duration: MOTION.dur.micro, ease: MOTION.ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
