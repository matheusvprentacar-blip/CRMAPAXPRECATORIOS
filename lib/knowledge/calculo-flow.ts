import { readFile, stat } from "node:fs/promises"
import path from "node:path"

const FLUXO_CALCULO_PATH = path.join(process.cwd(), "CRM APAX", "Processos", "Fluxo de Cálculo.md")

type SectionBlock = {
  title: string
  body: string
}

export type GuideDetailSection = {
  title: string
  summary: string
  items: string[]
}

export type CalculoFlowHighlightedNode = {
  title: string
  formula: string[]
  objective: string
  logic: string[]
  alerts: string[]
}

export type CalculoFlowStep = {
  title: string
  summary: string
  objective: string
  inputs: string[]
  operations: string[]
  outputs: string[]
  explanations: string[]
  codeRefs: string[]
}

export type CalculoFlowGuide = {
  sourcePath: string
  updatedAt: string
  overview: string
  highlightedNode: CalculoFlowHighlightedNode
  steps: CalculoFlowStep[]
  engineRules: GuideDetailSection[]
  closingFormulas: GuideDetailSection[]
  divergences: string[]
  syncNotes: string[]
}

function splitSections(markdown: string, level: number): SectionBlock[] {
  const prefix = `${"#".repeat(level)} `
  const lines = markdown.split(/\r?\n/)
  const sections: SectionBlock[] = []
  let currentTitle: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(prefix)) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: currentLines.join("\n").trim() })
      }
      currentTitle = line.slice(prefix.length).trim()
      currentLines = []
      continue
    }

    if (currentTitle) {
      currentLines.push(line)
    }
  }

  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentLines.join("\n").trim() })
  }

  return sections
}

function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim()
}

function toText(block: string): string {
  return block
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .join(" ")
    .trim()
}

function toItems(block: string): string[] {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const bulletItems = lines
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map(cleanLine)

  if (bulletItems.length > 0) {
    return bulletItems
  }

  const text = toText(block)
  return text ? [text] : []
}

function getSection(sections: SectionBlock[], title: string): SectionBlock | undefined {
  return sections.find((section) => section.title === title)
}

function getSubsectionMap(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const section of splitSections(block, 3)) {
    map.set(section.title, section.body)
  }
  return map
}

function parseDetailSections(section: SectionBlock | undefined): GuideDetailSection[] {
  if (!section) return []

  return splitSections(section.body, 3).map((detail) => ({
    title: detail.title,
    summary: toText(detail.body),
    items: toItems(detail.body),
  }))
}

function parseStep(section: SectionBlock): CalculoFlowStep {
  const subsectionMap = getSubsectionMap(section.body)

  return {
    title: section.title,
    summary: toText(section.body.split(/^###\s+/m)[0] || ""),
    objective: toText(subsectionMap.get("Objetivo") || ""),
    inputs: toItems(subsectionMap.get("Entradas") || ""),
    operations: toItems(subsectionMap.get("Operações") || ""),
    outputs: toItems(subsectionMap.get("Saídas") || ""),
    explanations: toItems(subsectionMap.get("Explicações separadas") || ""),
    codeRefs: toItems(subsectionMap.get("Código relacionado") || ""),
  }
}

function parseHighlightedNode(section: SectionBlock | undefined): CalculoFlowHighlightedNode {
  const subsectionMap = getSubsectionMap(section?.body || "")

  return {
    title: toText(subsectionMap.get("Nó central") || ""),
    formula: toItems(subsectionMap.get("Fórmula de leitura") || ""),
    objective: toText(subsectionMap.get("Objetivo") || ""),
    logic: toItems(subsectionMap.get("Ordem lógica") || ""),
    alerts: toItems(subsectionMap.get("Alertas") || ""),
  }
}

export async function loadCalculoFlowGuide(): Promise<CalculoFlowGuide> {
  const [markdown, fileStats] = await Promise.all([
    readFile(FLUXO_CALCULO_PATH, "utf8"),
    stat(FLUXO_CALCULO_PATH),
  ])

  const sections = splitSections(markdown, 2)
  const stepSections = sections.filter((section) => section.title.startsWith("Etapa "))

  return {
    sourcePath: path.relative(process.cwd(), FLUXO_CALCULO_PATH),
    updatedAt: fileStats.mtime.toISOString(),
    overview: toText(getSection(sections, "Visão Operacional")?.body || ""),
    highlightedNode: parseHighlightedNode(getSection(sections, "Nó Mestre do Cálculo")),
    steps: stepSections.map(parseStep),
    engineRules: parseDetailSections(getSection(sections, "Regras da Engine")),
    closingFormulas: parseDetailSections(getSection(sections, "Fórmulas de Fechamento")),
    divergences: toItems(getSection(sections, "Diferenças entre UI e Engine")?.body || ""),
    syncNotes: toItems(getSection(sections, "Sincronização com Obsidian")?.body || ""),
  }
}
