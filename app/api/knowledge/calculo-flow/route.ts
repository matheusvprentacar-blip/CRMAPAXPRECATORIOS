import { NextResponse } from "next/server"

import { loadCalculoFlowGuide } from "@/lib/knowledge/calculo-flow"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const guide = await loadCalculoFlowGuide()
    return NextResponse.json(guide)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar fluxo de cálculo."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
