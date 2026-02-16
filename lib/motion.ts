export const MOTION = {
  dur: {
    micro: 0.14,
    ui: 0.22,
    page: 0.26,
  },
  ease: "easeOut" as const,
  page: {
    initial: { opacity: 0, y: 10, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -6, filter: "blur(2px)" },
  },
  modal: {
    initial: { opacity: 0, y: 12, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 8, scale: 0.98 },
  },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 6 },
  },
} as const
