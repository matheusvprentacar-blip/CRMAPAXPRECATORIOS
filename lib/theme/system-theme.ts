export const SYSTEM_THEME_CONFIG_STORAGE_KEY = "system_theme_config_v1"
export const SYSTEM_THEME_EVENT_NAME = "system-theme:changed"

type ThemeVariableKey =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "border"
  | "input"
  | "ring"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"

export type ThemeVariables = Record<ThemeVariableKey, string>

type RouteShinyPalette = {
  base: string
  shine: string
  accent: string
  spread: string
}

export type ThemePresetId =
  | "apax_orange"
  | "ocean_blue"
  | "forest_green"
  | "ruby_red"
  | "graphite"

export type CustomThemeInput = {
  primary: string
  secondary: string
  accent: string
  backgroundLight: string
  backgroundDark: string
}

export type SystemThemeConfig = {
  version: 1
  mode: "preset" | "custom"
  preset: ThemePresetId
  custom: CustomThemeInput
}

export type SystemThemePalette = {
  id: ThemePresetId | "custom"
  name: string
  description: string
  light: ThemeVariables
  dark: ThemeVariables
  routeShiny: RouteShinyPalette
}

export const DEFAULT_CUSTOM_THEME: CustomThemeInput = {
  primary: "#ff8a00",
  secondary: "#f59e0b",
  accent: "#fb923c",
  backgroundLight: "#faf7f2",
  backgroundDark: "#171412",
}

export const DEFAULT_SYSTEM_THEME_CONFIG: SystemThemeConfig = {
  version: 1,
  mode: "preset",
  preset: "apax_orange",
  custom: DEFAULT_CUSTOM_THEME,
}

const VARIABLE_KEYS: ThemeVariableKey[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
]

const THEME_STYLE_ELEMENT_ID = "system-theme-dynamic-vars"

const PRESET_PALETTES: Record<ThemePresetId, SystemThemePalette> = {
  apax_orange: {
    id: "apax_orange",
    name: "APAX Laranja",
    description: "Tema padrao do sistema com laranja institucional.",
    routeShiny: {
      base: "#d5b58f",
      shine: "#fff6e9",
      accent: "#ff8a00",
      spread: "120deg",
    },
    light: {
      background: "30 20% 98%",
      foreground: "20 10% 10%",
      card: "0 0% 100%",
      "card-foreground": "20 10% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "20 10% 10%",
      primary: "25 95% 50%",
      "primary-foreground": "0 0% 100%",
      secondary: "25 30% 96%",
      "secondary-foreground": "25 95% 40%",
      muted: "30 15% 94%",
      "muted-foreground": "25 5% 45%",
      accent: "25 80% 96%",
      "accent-foreground": "25 95% 45%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: "30 10% 90%",
      input: "30 10% 90%",
      ring: "25 95% 50%",
      "chart-1": "25 95% 50%",
      "chart-2": "40 90% 60%",
      "chart-3": "15 85% 65%",
      "chart-4": "170 50% 45%",
      "chart-5": "220 40% 50%",
    },
    dark: {
      background: "24 10% 8%",
      foreground: "30 10% 98%",
      card: "24 10% 10%",
      "card-foreground": "30 10% 98%",
      popover: "24 10% 10%",
      "popover-foreground": "30 10% 98%",
      primary: "25 95% 55%",
      "primary-foreground": "0 0% 100%",
      secondary: "24 10% 16%",
      "secondary-foreground": "30 10% 98%",
      muted: "24 10% 16%",
      "muted-foreground": "24 5% 65%",
      accent: "25 95% 55%",
      "accent-foreground": "0 0% 100%",
      destructive: "0 63% 31%",
      "destructive-foreground": "0 0% 98%",
      border: "24 10% 20%",
      input: "24 10% 20%",
      ring: "25 95% 55%",
      "chart-1": "25 95% 55%",
      "chart-2": "40 90% 65%",
      "chart-3": "15 85% 70%",
      "chart-4": "170 50% 60%",
      "chart-5": "220 40% 65%",
    },
  },
  ocean_blue: {
    id: "ocean_blue",
    name: "Oceano Azul",
    description: "Visual corporativo com tons frios e alto contraste.",
    routeShiny: {
      base: "#a8bdd8",
      shine: "#f2f8ff",
      accent: "#3b82f6",
      spread: "120deg",
    },
    light: {
      background: "210 25% 98%",
      foreground: "220 25% 12%",
      card: "0 0% 100%",
      "card-foreground": "220 25% 12%",
      popover: "0 0% 100%",
      "popover-foreground": "220 25% 12%",
      primary: "217 91% 60%",
      "primary-foreground": "0 0% 100%",
      secondary: "210 40% 95%",
      "secondary-foreground": "217 70% 36%",
      muted: "212 30% 94%",
      "muted-foreground": "215 12% 45%",
      accent: "214 100% 96%",
      "accent-foreground": "217 72% 40%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: "214 20% 88%",
      input: "214 20% 88%",
      ring: "217 91% 60%",
      "chart-1": "217 91% 60%",
      "chart-2": "199 89% 48%",
      "chart-3": "187 85% 43%",
      "chart-4": "227 83% 57%",
      "chart-5": "172 66% 39%",
    },
    dark: {
      background: "220 20% 10%",
      foreground: "210 25% 97%",
      card: "220 18% 12%",
      "card-foreground": "210 25% 97%",
      popover: "220 18% 12%",
      "popover-foreground": "210 25% 97%",
      primary: "217 95% 66%",
      "primary-foreground": "222 47% 12%",
      secondary: "220 16% 18%",
      "secondary-foreground": "210 25% 97%",
      muted: "220 16% 18%",
      "muted-foreground": "214 12% 70%",
      accent: "217 95% 66%",
      "accent-foreground": "222 47% 12%",
      destructive: "0 72% 44%",
      "destructive-foreground": "0 0% 98%",
      border: "220 14% 22%",
      input: "220 14% 22%",
      ring: "217 95% 66%",
      "chart-1": "217 95% 66%",
      "chart-2": "199 92% 57%",
      "chart-3": "187 86% 58%",
      "chart-4": "227 83% 67%",
      "chart-5": "172 66% 55%",
    },
  },
  forest_green: {
    id: "forest_green",
    name: "Floresta Verde",
    description: "Paleta esmeralda para ambientes operacionais.",
    routeShiny: {
      base: "#a6ccb8",
      shine: "#f2fff8",
      accent: "#22c55e",
      spread: "122deg",
    },
    light: {
      background: "120 18% 98%",
      foreground: "145 22% 12%",
      card: "0 0% 100%",
      "card-foreground": "145 22% 12%",
      popover: "0 0% 100%",
      "popover-foreground": "145 22% 12%",
      primary: "145 70% 42%",
      "primary-foreground": "0 0% 100%",
      secondary: "145 35% 95%",
      "secondary-foreground": "146 62% 30%",
      muted: "140 22% 93%",
      "muted-foreground": "145 12% 43%",
      accent: "144 52% 95%",
      "accent-foreground": "146 62% 30%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: "142 18% 88%",
      input: "142 18% 88%",
      ring: "145 70% 42%",
      "chart-1": "145 70% 42%",
      "chart-2": "160 84% 39%",
      "chart-3": "171 77% 37%",
      "chart-4": "84 63% 42%",
      "chart-5": "218 40% 50%",
    },
    dark: {
      background: "145 22% 9%",
      foreground: "140 20% 97%",
      card: "145 19% 12%",
      "card-foreground": "140 20% 97%",
      popover: "145 19% 12%",
      "popover-foreground": "140 20% 97%",
      primary: "145 69% 52%",
      "primary-foreground": "145 45% 10%",
      secondary: "146 14% 18%",
      "secondary-foreground": "140 20% 97%",
      muted: "146 14% 18%",
      "muted-foreground": "145 10% 69%",
      accent: "145 69% 52%",
      "accent-foreground": "145 45% 10%",
      destructive: "0 72% 44%",
      "destructive-foreground": "0 0% 98%",
      border: "146 12% 22%",
      input: "146 12% 22%",
      ring: "145 69% 52%",
      "chart-1": "145 69% 52%",
      "chart-2": "160 84% 50%",
      "chart-3": "171 77% 52%",
      "chart-4": "84 63% 55%",
      "chart-5": "218 40% 63%",
    },
  },
  ruby_red: {
    id: "ruby_red",
    name: "Rubi",
    description: "Tema energico com foco em tons quentes de destaque.",
    routeShiny: {
      base: "#d8aec0",
      shine: "#fff2f7",
      accent: "#ef4444",
      spread: "120deg",
    },
    light: {
      background: "0 22% 98%",
      foreground: "350 25% 12%",
      card: "0 0% 100%",
      "card-foreground": "350 25% 12%",
      popover: "0 0% 100%",
      "popover-foreground": "350 25% 12%",
      primary: "355 78% 55%",
      "primary-foreground": "0 0% 100%",
      secondary: "350 40% 95%",
      "secondary-foreground": "350 70% 35%",
      muted: "352 26% 93%",
      "muted-foreground": "350 14% 44%",
      accent: "350 68% 95%",
      "accent-foreground": "350 70% 35%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: "350 20% 88%",
      input: "350 20% 88%",
      ring: "355 78% 55%",
      "chart-1": "355 78% 55%",
      "chart-2": "14 85% 58%",
      "chart-3": "31 92% 55%",
      "chart-4": "280 55% 55%",
      "chart-5": "215 45% 52%",
    },
    dark: {
      background: "350 18% 10%",
      foreground: "0 12% 97%",
      card: "350 16% 12%",
      "card-foreground": "0 12% 97%",
      popover: "350 16% 12%",
      "popover-foreground": "0 12% 97%",
      primary: "355 83% 64%",
      "primary-foreground": "355 45% 12%",
      secondary: "350 12% 18%",
      "secondary-foreground": "0 12% 97%",
      muted: "350 12% 18%",
      "muted-foreground": "350 8% 70%",
      accent: "355 83% 64%",
      "accent-foreground": "355 45% 12%",
      destructive: "0 72% 44%",
      "destructive-foreground": "0 0% 98%",
      border: "350 10% 23%",
      input: "350 10% 23%",
      ring: "355 83% 64%",
      "chart-1": "355 83% 64%",
      "chart-2": "14 85% 65%",
      "chart-3": "31 92% 61%",
      "chart-4": "280 55% 68%",
      "chart-5": "215 45% 64%",
    },
  },
  graphite: {
    id: "graphite",
    name: "Grafite",
    description: "Visual neutro para operacoes com baixo ruido visual.",
    routeShiny: {
      base: "#9ca3af",
      shine: "#f3f4f6",
      accent: "#6b7280",
      spread: "118deg",
    },
    light: {
      background: "220 16% 98%",
      foreground: "220 14% 12%",
      card: "0 0% 100%",
      "card-foreground": "220 14% 12%",
      popover: "0 0% 100%",
      "popover-foreground": "220 14% 12%",
      primary: "220 9% 38%",
      "primary-foreground": "0 0% 100%",
      secondary: "220 18% 95%",
      "secondary-foreground": "220 12% 30%",
      muted: "220 14% 93%",
      "muted-foreground": "220 8% 43%",
      accent: "220 18% 95%",
      "accent-foreground": "220 12% 30%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: "220 12% 88%",
      input: "220 12% 88%",
      ring: "220 9% 38%",
      "chart-1": "220 9% 38%",
      "chart-2": "215 16% 46%",
      "chart-3": "207 26% 49%",
      "chart-4": "187 28% 43%",
      "chart-5": "28 45% 52%",
    },
    dark: {
      background: "220 10% 9%",
      foreground: "0 0% 97%",
      card: "220 10% 12%",
      "card-foreground": "0 0% 97%",
      popover: "220 10% 12%",
      "popover-foreground": "0 0% 97%",
      primary: "220 10% 65%",
      "primary-foreground": "220 20% 11%",
      secondary: "220 10% 18%",
      "secondary-foreground": "0 0% 97%",
      muted: "220 10% 18%",
      "muted-foreground": "220 6% 70%",
      accent: "220 10% 65%",
      "accent-foreground": "220 20% 11%",
      destructive: "0 72% 44%",
      "destructive-foreground": "0 0% 98%",
      border: "220 9% 24%",
      input: "220 9% 24%",
      ring: "220 10% 65%",
      "chart-1": "220 10% 65%",
      "chart-2": "215 16% 63%",
      "chart-3": "207 26% 66%",
      "chart-4": "187 28% 60%",
      "chart-5": "28 45% 62%",
    },
  },
}

type Hsl = {
  h: number
  s: number
  l: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeHex = (value: string) => {
  const raw = (value || "").trim()
  const withHash = raw.startsWith("#") ? raw : `#${raw}`
  const shortHex = /^#[0-9a-fA-F]{3}$/
  const fullHex = /^#[0-9a-fA-F]{6}$/

  if (fullHex.test(withHash)) return withHash.toLowerCase()
  if (shortHex.test(withHash)) {
    const chars = withHash.slice(1).split("")
    return `#${chars.map((char) => `${char}${char}`).join("")}`.toLowerCase()
  }
  return null
}

const hexToRgb = (value: string) => {
  const normalized = normalizeHex(value)
  if (!normalized) return null
  const hex = normalized.slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return { r, g, b }
}

const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }): Hsl => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

const hexToHsl = (value: string, fallback: Hsl): Hsl => {
  const rgb = hexToRgb(value)
  if (!rgb) return fallback
  return rgbToHsl(rgb)
}

const hslValue = (h: number, s: number, l: number) =>
  `${Math.round((h + 360) % 360)} ${clamp(Math.round(s), 0, 100)}% ${clamp(Math.round(l), 0, 100)}%`

const adjust = (hsl: Hsl, deltaS: number, deltaL: number) =>
  hslValue(hsl.h, hsl.s + deltaS, hsl.l + deltaL)

const asHslValue = (hsl: Hsl) => hslValue(hsl.h, hsl.s, hsl.l)

const TAILWIND_COLOR_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
type TailwindColorStep = (typeof TAILWIND_COLOR_STEPS)[number]

const TAILWIND_COLOR_FAMILIES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const

type TailwindColorFamily = (typeof TAILWIND_COLOR_FAMILIES)[number]

type TailwindColorScale = Record<TailwindColorStep, string>
type TailwindColorAnchors = Record<TailwindColorFamily, Hsl>
type TailwindRuntimeVariables = Record<`tw-color-${TailwindColorFamily}-${TailwindColorStep}`, string>
type ThemeTone = "light" | "dark"

const TAILWIND_SCALE_LIGHTNESS: Record<TailwindColorStep, number> = {
  50: 98,
  100: 95,
  200: 90,
  300: 83,
  400: 72,
  500: 60,
  600: 51,
  700: 42,
  800: 33,
  900: 24,
  950: 16,
}

const TAILWIND_VIVID_SATURATION_FACTOR: Record<TailwindColorStep, number> = {
  50: 0.24,
  100: 0.32,
  200: 0.42,
  300: 0.56,
  400: 0.74,
  500: 1,
  600: 0.92,
  700: 0.84,
  800: 0.74,
  900: 0.64,
  950: 0.54,
}

const TAILWIND_NEUTRAL_SATURATION_BASE: Record<TailwindColorStep, number> = {
  50: 8,
  100: 8,
  200: 7,
  300: 7,
  400: 8,
  500: 9,
  600: 10,
  700: 11,
  800: 12,
  900: 12,
  950: 13,
}

const TAILWIND_DARK_VIVID_MAX_SATURATION: Partial<Record<TailwindColorStep, number>> = {
  800: 24,
  900: 13,
  950: 8,
}

const FIXED_CUSTOM_LIGHT_BACKGROUND: Hsl = { h: 30, s: 20, l: 98 }
const FIXED_CUSTOM_DARK_BACKGROUND: Hsl = { h: 24, s: 10, l: 8 }

const LOCKED_LIGHT_SURFACE_TOKENS: Pick<
  ThemeVariables,
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "input"
> = {
  background: "30 20% 98%",
  foreground: "20 10% 10%",
  card: "0 0% 100%",
  "card-foreground": "20 10% 10%",
  popover: "0 0% 100%",
  "popover-foreground": "20 10% 10%",
  secondary: "220 14% 96%",
  "secondary-foreground": "220 16% 24%",
  muted: "220 14% 94%",
  "muted-foreground": "220 8% 45%",
  border: "220 12% 88%",
  input: "220 12% 88%",
}

const LOCKED_DARK_SURFACE_TOKENS: Pick<
  ThemeVariables,
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "input"
> = {
  background: "24 10% 8%",
  foreground: "30 10% 98%",
  card: "24 10% 10%",
  "card-foreground": "30 10% 98%",
  popover: "24 10% 10%",
  "popover-foreground": "30 10% 98%",
  secondary: "24 10% 16%",
  "secondary-foreground": "30 10% 98%",
  muted: "24 10% 16%",
  "muted-foreground": "24 5% 65%",
  border: "24 10% 20%",
  input: "24 10% 20%",
}

const parseHslValue = (value: string, fallback: Hsl): Hsl => {
  const match = value
    ?.trim()
    .match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/)

  if (!match) return fallback

  const h = Number(match[1])
  const s = Number(match[2])
  const l = Number(match[3])

  if (![h, s, l].every((n) => Number.isFinite(n))) return fallback

  return {
    h: ((h % 360) + 360) % 360,
    s: clamp(s, 0, 100),
    l: clamp(l, 0, 100),
  }
}

const withHueOffset = (h: number, offset: number) => ((h + offset) % 360 + 360) % 360

const vividAnchor = (h: number, s: number): Hsl => ({
  h: withHueOffset(h, 0),
  s: clamp(s, 28, 98),
  l: 60,
})

const neutralAnchor = (h: number, s: number): Hsl => ({
  h: withHueOffset(h, 0),
  s: clamp(s, 2, 18),
  l: 60,
})

const buildTailwindColorScale = (
  anchor: Hsl,
  neutral: boolean,
  tone: ThemeTone,
): TailwindColorScale => {
  const scale = {} as TailwindColorScale

  for (const step of TAILWIND_COLOR_STEPS) {
    const lightness = TAILWIND_SCALE_LIGHTNESS[step]
    let saturation = neutral
      ? clamp((anchor.s + TAILWIND_NEUTRAL_SATURATION_BASE[step]) / 2, 2, 18)
      : clamp(anchor.s * TAILWIND_VIVID_SATURATION_FACTOR[step], 24, 98)

    if (!neutral && tone === "dark") {
      const darkMax = TAILWIND_DARK_VIVID_MAX_SATURATION[step]
      if (typeof darkMax === "number") {
        saturation = Math.min(saturation, darkMax)
      }
    }

    scale[step] = hslValue(anchor.h, saturation, lightness)
  }

  return scale
}

const buildTailwindColorAnchors = (variables: ThemeVariables): TailwindColorAnchors => {
  const primary = parseHslValue(variables.primary, { h: 25, s: 95, l: 50 })
  const chart2 = parseHslValue(variables["chart-2"], { h: 40, s: 90, l: 60 })
  const chart3 = parseHslValue(variables["chart-3"], { h: 15, s: 85, l: 65 })
  const chart4 = parseHslValue(variables["chart-4"], { h: 170, s: 50, l: 45 })
  const destructive = parseHslValue(variables.destructive, { h: 0, s: 84, l: 60 })
  const foreground = parseHslValue(variables.foreground, { h: 220, s: 10, l: 12 })

  return {
    slate: neutralAnchor(withHueOffset(foreground.h, 12), 14),
    gray: neutralAnchor(withHueOffset(foreground.h, 0), 8),
    zinc: neutralAnchor(withHueOffset(foreground.h, -10), 10),
    neutral: neutralAnchor(withHueOffset(foreground.h, -2), 6),
    stone: neutralAnchor(withHueOffset(foreground.h, 24), 14),
    red: vividAnchor(destructive.h, Math.max(destructive.s, 74)),
    orange: vividAnchor(primary.h, Math.max(primary.s, 72)),
    amber: vividAnchor(withHueOffset(primary.h, 12), Math.max(primary.s - 4, 68)),
    yellow: vividAnchor(withHueOffset(primary.h, 30), Math.max(primary.s - 10, 64)),
    lime: vividAnchor(withHueOffset(primary.h, 68), Math.max(primary.s - 18, 60)),
    green: vividAnchor(chart2.h, Math.max(chart2.s, 62)),
    emerald: vividAnchor(withHueOffset(chart2.h, 14), Math.max(chart2.s + 4, 64)),
    teal: vividAnchor(chart4.h, Math.max(chart4.s, 58)),
    cyan: vividAnchor(withHueOffset(chart4.h, 18), Math.max(chart4.s + 6, 62)),
    sky: vividAnchor(withHueOffset(chart4.h, 34), Math.max(chart4.s + 8, 66)),
    blue: vividAnchor(withHueOffset(primary.h, 200), Math.max(primary.s - 8, 64)),
    indigo: vividAnchor(withHueOffset(primary.h, 225), Math.max(primary.s - 4, 66)),
    violet: vividAnchor(withHueOffset(primary.h, 248), Math.max(primary.s, 68)),
    purple: vividAnchor(withHueOffset(primary.h, 275), Math.max(primary.s + 2, 70)),
    fuchsia: vividAnchor(withHueOffset(primary.h, 304), Math.max(primary.s + 4, 72)),
    pink: vividAnchor(withHueOffset(chart3.h, 20), Math.max(chart3.s, 68)),
    rose: vividAnchor(withHueOffset(destructive.h, -12), Math.max(destructive.s, 70)),
  }
}

const buildTailwindRuntimeVariables = (
  variables: ThemeVariables,
  tone: ThemeTone,
): TailwindRuntimeVariables => {
  const anchors = buildTailwindColorAnchors(variables)
  const runtime = {} as TailwindRuntimeVariables

  for (const family of TAILWIND_COLOR_FAMILIES) {
    const neutral = ["slate", "gray", "zinc", "neutral", "stone"].includes(family)
    const scale = buildTailwindColorScale(anchors[family], neutral, tone)

    for (const step of TAILWIND_COLOR_STEPS) {
      runtime[`tw-color-${family}-${step}`] = scale[step]
    }
  }

  return runtime
}

const foregroundByLightness = (l: number) => (l >= 56 ? "220 20% 12%" : "0 0% 98%")

const hslToHex = ({ h, s, l }: Hsl) => {
  const sat = clamp(s, 0, 100) / 100
  const lig = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (value: number) => {
    const normalized = Math.round((value + m) * 255)
    return normalized.toString(16).padStart(2, "0")
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const sanitizeCustomTheme = (raw: unknown): CustomThemeInput => {
  const source = raw && typeof raw === "object" ? (raw as Partial<CustomThemeInput>) : {}
  return {
    primary: normalizeHex(source.primary || "") ?? DEFAULT_CUSTOM_THEME.primary,
    secondary: normalizeHex(source.secondary || "") ?? DEFAULT_CUSTOM_THEME.secondary,
    accent: normalizeHex(source.accent || "") ?? DEFAULT_CUSTOM_THEME.accent,
    backgroundLight: normalizeHex(source.backgroundLight || "") ?? DEFAULT_CUSTOM_THEME.backgroundLight,
    backgroundDark: normalizeHex(source.backgroundDark || "") ?? DEFAULT_CUSTOM_THEME.backgroundDark,
  }
}

export const getThemePresetOptions = (): SystemThemePalette[] => Object.values(PRESET_PALETTES)

export const getThemePreset = (preset: ThemePresetId): SystemThemePalette =>
  PRESET_PALETTES[preset] ?? PRESET_PALETTES.apax_orange

export const sanitizeSystemThemeConfig = (raw: unknown): SystemThemeConfig => {
  const fallback = DEFAULT_SYSTEM_THEME_CONFIG
  if (!raw || typeof raw !== "object") return fallback

  const value = raw as Partial<SystemThemeConfig>
  const preset = value.preset && value.preset in PRESET_PALETTES ? (value.preset as ThemePresetId) : fallback.preset
  const mode = value.mode === "custom" ? "custom" : "preset"

  return {
    version: 1,
    mode,
    preset,
    custom: sanitizeCustomTheme(value.custom),
  }
}

export const deserializeSystemThemeConfig = (input: string | null | undefined): SystemThemeConfig => {
  if (!input) return DEFAULT_SYSTEM_THEME_CONFIG
  try {
    return sanitizeSystemThemeConfig(JSON.parse(input))
  } catch {
    return DEFAULT_SYSTEM_THEME_CONFIG
  }
}

const buildCustomPalette = (customInput: CustomThemeInput): SystemThemePalette => {
  const custom = sanitizeCustomTheme(customInput)
  const primary = hexToHsl(custom.primary, { h: 25, s: 95, l: 52 })
  const secondary = hexToHsl(custom.secondary, { h: 35, s: 90, l: 56 })
  const accent = hexToHsl(custom.accent, { h: 20, s: 85, l: 60 })
  // Background colors are fixed in custom mode; admin customizes only text/highlights.
  const bgLight = FIXED_CUSTOM_LIGHT_BACKGROUND
  const bgDark = FIXED_CUSTOM_DARK_BACKGROUND

  const primaryDark: Hsl = {
    h: primary.h,
    s: clamp(primary.s, 45, 95),
    l: clamp(primary.l + 8, 45, 72),
  }
  const secondaryLight: Hsl = {
    h: secondary.h,
    s: clamp(secondary.s - 45, 8, 65),
    l: clamp(bgLight.l - 3, 85, 98),
  }
  const secondaryDark: Hsl = {
    h: bgDark.h,
    s: clamp(bgDark.s + 2, 0, 12),
    l: clamp(bgDark.l + 10, 14, 26),
  }
  const accentLight: Hsl = {
    h: accent.h,
    s: clamp(accent.s - 48, 10, 60),
    l: clamp(bgLight.l - 2, 84, 98),
  }
  const accentDark: Hsl = {
    h: accent.h,
    s: clamp(accent.s, 48, 95),
    l: clamp(accent.l + 6, 48, 76),
  }

  const fgLight = foregroundByLightness(bgLight.l)
  const fgDark = foregroundByLightness(bgDark.l)
  const primaryFgLight = foregroundByLightness(primary.l)
  const primaryFgDark = foregroundByLightness(primaryDark.l)
  const secondaryFgLight = foregroundByLightness(secondaryLight.l)
  const secondaryFgDark = foregroundByLightness(secondaryDark.l)
  const accentFgLight = foregroundByLightness(accentLight.l)
  const accentFgDark = foregroundByLightness(accentDark.l)

  return {
    id: "custom",
    name: "Personalizado",
    description: "Paleta personalizada pelo administrador.",
    routeShiny: {
      base: hslToHex({ h: secondary.h, s: clamp(secondary.s - 25, 20, 90), l: clamp(secondary.l + 18, 20, 95) }),
      shine: hslToHex({ h: accent.h, s: clamp(accent.s - 35, 12, 70), l: 96 }),
      accent: hslToHex(primary),
      spread: "120deg",
    },
    light: {
      background: asHslValue(bgLight),
      foreground: fgLight,
      card: hslValue(bgLight.h, clamp(bgLight.s - 10, 0, 40), clamp(bgLight.l + 2, 84, 100)),
      "card-foreground": fgLight,
      popover: hslValue(bgLight.h, clamp(bgLight.s - 12, 0, 40), clamp(bgLight.l + 3, 85, 100)),
      "popover-foreground": fgLight,
      primary: asHslValue(primary),
      "primary-foreground": primaryFgLight,
      secondary: asHslValue(secondaryLight),
      "secondary-foreground": secondaryFgLight,
      muted: hslValue(bgLight.h, clamp(bgLight.s - 12, 0, 35), clamp(bgLight.l - 4, 82, 96)),
      "muted-foreground": hslValue(bgLight.h, clamp(bgLight.s - 18, 4, 28), 42),
      accent: asHslValue(accentLight),
      "accent-foreground": accentFgLight,
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 98%",
      border: hslValue(bgLight.h, clamp(bgLight.s - 12, 0, 30), clamp(bgLight.l - 12, 72, 90)),
      input: hslValue(bgLight.h, clamp(bgLight.s - 12, 0, 30), clamp(bgLight.l - 12, 72, 90)),
      ring: asHslValue(primary),
      "chart-1": asHslValue(primary),
      "chart-2": asHslValue(secondary),
      "chart-3": asHslValue(accent),
      "chart-4": adjust(secondary, -5, -15),
      "chart-5": adjust(primary, -10, -18),
    },
    dark: {
      background: asHslValue(bgDark),
      foreground: fgDark,
      card: hslValue(bgDark.h, clamp(bgDark.s - 5, 0, 25), clamp(bgDark.l + 3, 10, 22)),
      "card-foreground": fgDark,
      popover: hslValue(bgDark.h, clamp(bgDark.s - 5, 0, 25), clamp(bgDark.l + 3, 10, 22)),
      "popover-foreground": fgDark,
      primary: asHslValue(primaryDark),
      "primary-foreground": primaryFgDark,
      secondary: asHslValue(secondaryDark),
      "secondary-foreground": secondaryFgDark,
      muted: hslValue(bgDark.h, clamp(bgDark.s - 8, 0, 20), clamp(bgDark.l + 10, 16, 28)),
      "muted-foreground": hslValue(bgDark.h, clamp(bgDark.s + 2, 4, 18), 70),
      accent: asHslValue(accentDark),
      "accent-foreground": accentFgDark,
      destructive: "0 72% 44%",
      "destructive-foreground": "0 0% 98%",
      border: hslValue(bgDark.h, clamp(bgDark.s - 6, 0, 18), clamp(bgDark.l + 14, 20, 32)),
      input: hslValue(bgDark.h, clamp(bgDark.s - 6, 0, 18), clamp(bgDark.l + 14, 20, 32)),
      ring: asHslValue(primaryDark),
      "chart-1": asHslValue(primaryDark),
      "chart-2": hslValue(secondary.h, clamp(secondary.s, 48, 95), clamp(secondary.l + 10, 48, 78)),
      "chart-3": hslValue(accent.h, clamp(accent.s, 48, 95), clamp(accent.l + 10, 48, 78)),
      "chart-4": hslValue(secondary.h, clamp(secondary.s - 10, 32, 80), clamp(secondary.l + 2, 42, 72)),
      "chart-5": hslValue(primary.h, clamp(primary.s - 18, 24, 70), clamp(primary.l + 16, 50, 82)),
    },
  }
}

const emphasizeHighlight = (value: string, fallback: Hsl, tone: ThemeTone): Hsl => {
  const parsed = parseHslValue(value, fallback)
  const strongSaturation = Math.max(parsed.s, tone === "dark" ? 78 : 72)
  const strongLightness = tone === "dark"
    ? clamp(parsed.l < 54 ? parsed.l + 10 : parsed.l, 54, 72)
    : clamp(parsed.l, 46, 62)

  return {
    h: parsed.h,
    s: clamp(strongSaturation, 0, 98),
    l: strongLightness,
  }
}

const lockNeutralSurfaces = (palette: SystemThemePalette): SystemThemePalette => {
  const lightPrimary = emphasizeHighlight(
    palette.light.primary,
    { h: 25, s: 95, l: 50 },
    "light",
  )
  const darkPrimary = emphasizeHighlight(
    palette.dark.primary,
    { h: 25, s: 95, l: 55 },
    "dark",
  )
  const lightAccent = emphasizeHighlight(palette.light.accent, lightPrimary, "light")
  const darkAccent = emphasizeHighlight(palette.dark.accent, darkPrimary, "dark")

  return {
    ...palette,
    routeShiny: {
      base: "#d5b58f",
      shine: "#fff6e9",
      accent: hslToHex(lightPrimary),
      spread: palette.routeShiny.spread || "120deg",
    },
    light: {
      ...palette.light,
      ...LOCKED_LIGHT_SURFACE_TOKENS,
      primary: asHslValue(lightPrimary),
      "primary-foreground": foregroundByLightness(lightPrimary.l),
      accent: asHslValue(lightAccent),
      "accent-foreground": foregroundByLightness(lightAccent.l),
      ring: asHslValue(lightPrimary),
      "chart-1": asHslValue(lightPrimary),
      "chart-2": asHslValue(emphasizeHighlight(palette.light["chart-2"], lightPrimary, "light")),
      "chart-3": asHslValue(emphasizeHighlight(palette.light["chart-3"], lightAccent, "light")),
      "chart-4": asHslValue(emphasizeHighlight(palette.light["chart-4"], { h: 170, s: 55, l: 50 }, "light")),
      "chart-5": asHslValue(emphasizeHighlight(palette.light["chart-5"], { h: 220, s: 50, l: 50 }, "light")),
    },
    dark: {
      ...palette.dark,
      ...LOCKED_DARK_SURFACE_TOKENS,
      primary: asHslValue(darkPrimary),
      "primary-foreground": foregroundByLightness(darkPrimary.l),
      accent: asHslValue(darkAccent),
      "accent-foreground": foregroundByLightness(darkAccent.l),
      ring: asHslValue(darkPrimary),
      "chart-1": asHslValue(darkPrimary),
      "chart-2": asHslValue(emphasizeHighlight(palette.dark["chart-2"], darkPrimary, "dark")),
      "chart-3": asHslValue(emphasizeHighlight(palette.dark["chart-3"], darkAccent, "dark")),
      "chart-4": asHslValue(emphasizeHighlight(palette.dark["chart-4"], { h: 170, s: 60, l: 62 }, "dark")),
      "chart-5": asHslValue(emphasizeHighlight(palette.dark["chart-5"], { h: 220, s: 55, l: 66 }, "dark")),
    },
  }
}

export const resolveSystemThemePalette = (config: SystemThemeConfig): SystemThemePalette => {
  const palette = config.mode === "custom" ? buildCustomPalette(config.custom) : getThemePreset(config.preset)
  return lockNeutralSurfaces(palette)
}

const mapVariablesToCss = (
  selector: ":root" | ".dark",
  variables: ThemeVariables,
  routeShiny?: RouteShinyPalette,
  runtimeColors?: TailwindRuntimeVariables,
) => {
  const chunks = VARIABLE_KEYS.map((key) => `  --${key}: ${variables[key]};`)

  if (runtimeColors) {
    for (const [key, value] of Object.entries(runtimeColors)) {
      chunks.push(`  --${key}: ${value};`)
    }
  }

  if (selector === ":root" && routeShiny) {
    chunks.push(`  --route-shiny-base: ${routeShiny.base};`)
    chunks.push(`  --route-shiny-shine: ${routeShiny.shine};`)
    chunks.push(`  --route-shiny-accent: ${routeShiny.accent};`)
    chunks.push(`  --route-shiny-spread: ${routeShiny.spread};`)
  }

  return `${selector} {\n${chunks.join("\n")}\n}`
}

export const buildSystemThemeCss = (palette: SystemThemePalette) =>
  `${mapVariablesToCss(":root", palette.light, palette.routeShiny, buildTailwindRuntimeVariables(palette.light, "light"))}\n${mapVariablesToCss(".dark", palette.dark, undefined, buildTailwindRuntimeVariables(palette.dark, "dark"))}`

export const applySystemTheme = (config: SystemThemeConfig) => {
  if (typeof window === "undefined" || typeof document === "undefined") return resolveSystemThemePalette(config)
  const safeConfig = sanitizeSystemThemeConfig(config)
  const palette = resolveSystemThemePalette(safeConfig)
  const css = buildSystemThemeCss(palette)

  let styleEl = document.getElementById(THEME_STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = THEME_STYLE_ELEMENT_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = css

  return palette
}
