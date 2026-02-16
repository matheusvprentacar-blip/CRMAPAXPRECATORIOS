"use client"

import type React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { MOTION } from "@/lib/motion"

export function StepContainer({
  stepKey,
  children,
}: {
  stepKey: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={reduce ? { opacity: 1 } : { opacity: 0, x: 10 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 1 } : { opacity: 0, x: -8 }}
        transition={{ duration: MOTION.dur.ui, ease: MOTION.ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
