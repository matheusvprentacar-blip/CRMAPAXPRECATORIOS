"use client"

import Aurora from "@/components/Aurora"

const GLOBAL_AURORA_STOPS = ["#e6b584", "#f96b06", "#ff9f1a"]

export function GlobalAuroraBackground() {
  return (
    <div className="global-aurora-background" aria-hidden="true">
      <div className="global-aurora-stage">
        <Aurora colorStops={GLOBAL_AURORA_STOPS} amplitude={0.9} blend={1} />
      </div>
      <div className="global-aurora-overlay" />
    </div>
  )
}
