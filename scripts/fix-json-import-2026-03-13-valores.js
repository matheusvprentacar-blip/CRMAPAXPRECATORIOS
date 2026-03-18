const fs = require("fs")
const path = require("path")

require("dotenv").config({ path: ".env.local" })

const { createClient } = require("@supabase/supabase-js")

const MODE = getArgValue("--mode") || "dry-run"
const SNAPSHOT_PATH = getArgValue("--snapshot")
const EXPECTED_COUNT = Number(getArgValue("--expected-count") || "646")

const TARGET = {
  createdBy: "7abcc000-7384-4ead-afe3-4fbdee4f9472",
  from: "2026-03-13T00:00:00-03:00",
  to: "2026-03-14T00:00:00-03:00",
  status: "novo",
  statusKanban: "entrada",
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

async function main() {
  if (!["dry-run", "apply", "rollback"].includes(MODE)) {
    throw new Error(`Unsupported mode "${MODE}". Use dry-run, apply, or rollback.`)
  }

  if (MODE === "rollback") {
    if (!SNAPSHOT_PATH) {
      throw new Error("Rollback requires --snapshot <path>.")
    }
    await rollbackFromSnapshot(SNAPSHOT_PATH)
    return
  }

  const candidates = await fetchCandidates()
  const summary = buildSummary(candidates)

  console.log(JSON.stringify({ mode: MODE, summary }, null, 2))

  if (MODE === "dry-run") {
    return
  }

  if (summary.total !== EXPECTED_COUNT) {
    throw new Error(
      `Candidate count mismatch. Expected ${EXPECTED_COUNT}, found ${summary.total}. Aborting apply.`
    )
  }

  const snapshotPath = writeSnapshot(candidates)
  console.log(`Snapshot written to: ${snapshotPath}`)

  await applyFix(candidates)

  const postCheck = await fetchCandidates()
  const postSummary = buildSummary(postCheck)
  console.log(JSON.stringify({ mode: "post-apply", summary: postSummary }, null, 2))

  if (postSummary.total !== 0) {
    throw new Error(
      `Post-apply validation failed. ${postSummary.total} candidate rows still match the bug filter.`
    )
  }
}

function getArgValue(name) {
  const args = process.argv.slice(2)
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] || null
}

async function fetchCandidates() {
  const { data, error } = await supabase
    .from("precatorios")
    .select(
      [
        "id",
        "titulo",
        "numero_precatorio",
        "credor_nome",
        "criado_por",
        "dono_usuario_id",
        "responsavel",
        "status",
        "status_kanban",
        "localizacao_kanban",
        "valor_principal",
        "valor_atualizado",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .gte("created_at", TARGET.from)
    .lt("created_at", TARGET.to)
    .eq("criado_por", TARGET.createdBy)
    .eq("status", TARGET.status)
    .eq("status_kanban", TARGET.statusKanban)
    .gt("valor_atualizado", 0)
    .order("created_at", { ascending: true })
    .limit(5000)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).filter((row) => {
    const principal = asNumber(row.valor_principal)
    const atualizado = asNumber(row.valor_atualizado)
    return (
      (row.valor_principal == null || principal === 0) &&
      atualizado > 0 &&
      String(row.created_at) === String(row.updated_at)
    )
  })
}

function buildSummary(rows) {
  const totalAtualizado = rows.reduce((sum, row) => sum + asNumber(row.valor_atualizado), 0)
  const totalPrincipal = rows.reduce((sum, row) => sum + asNumber(row.valor_principal), 0)
  return {
    total: rows.length,
    total_valor_principal: roundCurrency(totalPrincipal),
    total_valor_atualizado: roundCurrency(totalAtualizado),
    first_created_at: rows[0]?.created_at || null,
    last_created_at: rows[rows.length - 1]?.created_at || null,
    sample: rows.slice(0, 10).map((row) => ({
      id: row.id,
      numero_precatorio: row.numero_precatorio,
      credor_nome: row.credor_nome,
      valor_principal: row.valor_principal,
      valor_atualizado: row.valor_atualizado,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  }
}

function writeSnapshot(rows) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const dir = path.join(process.cwd(), "backups")
  fs.mkdirSync(dir, { recursive: true })

  const snapshotPath = path.join(dir, `precatorios-fix-2026-03-13-${timestamp}.json`)
  const payload = {
    created_at: new Date().toISOString(),
    description: "Snapshot before fixing JSON import values from 2026-03-13",
    target: TARGET,
    expected_count: EXPECTED_COUNT,
    rows,
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2), "utf8")
  return snapshotPath
}

async function applyFix(rows) {
  let updated = 0
  for (const row of rows) {
    const nextPrincipal = asNumber(row.valor_atualizado)
    const { error } = await supabase
      .from("precatorios")
      .update({
        valor_principal: nextPrincipal,
        valor_atualizado: null,
      })
      .eq("id", row.id)
      .eq("criado_por", TARGET.createdBy)
      .eq("status", TARGET.status)
      .eq("status_kanban", TARGET.statusKanban)

    if (error) {
      throw new Error(`Failed updating ${row.id}: ${error.message}`)
    }
    updated += 1
  }

  console.log(`Updated rows: ${updated}`)
}

async function rollbackFromSnapshot(snapshotPath) {
  const absolutePath = path.isAbsolute(snapshotPath)
    ? snapshotPath
    : path.join(process.cwd(), snapshotPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Snapshot not found: ${absolutePath}`)
  }

  const snapshot = JSON.parse(fs.readFileSync(absolutePath, "utf8"))
  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : []

  if (rows.length === 0) {
    throw new Error("Snapshot does not contain rows.")
  }

  let restored = 0
  for (const row of rows) {
    const { error } = await supabase
      .from("precatorios")
      .update({
        valor_principal: row.valor_principal,
        valor_atualizado: row.valor_atualizado,
      })
      .eq("id", row.id)

    if (error) {
      throw new Error(`Failed restoring ${row.id}: ${error.message}`)
    }
    restored += 1
  }

  console.log(`Rollback restored rows: ${restored}`)
}

function asNumber(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundCurrency(value) {
  return Number(value.toFixed(2))
}
