import * as React from "react"

type OverlayStyle = React.CSSProperties | undefined

export function withSolidDialogSurface(style?: OverlayStyle): React.CSSProperties {
  return {
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    backgroundImage: "none",
    opacity: 1,
    ...style,
  }
}

export function withSolidFloatingSurface(style?: OverlayStyle): React.CSSProperties {
  return {
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    backgroundImage: "none",
    opacity: 1,
    ...style,
  }
}
