#!/usr/bin/env node

import { spawn } from "node:child_process"

const rawArg = process.argv[2]

if (!rawArg) {
  console.error(
    "Uso: npm run ui:add:8star -- <component>\nExemplo: npm run ui:add:8star -- button"
  )
  process.exit(1)
}

const component = rawArg
  .replace(/^<|>$/g, "")
  .replace(/\.json$/i, "")
  .trim()

if (!component) {
  console.error("Componente invalido.")
  process.exit(1)
}

const url = `https://ui.8starlabs.com/r/${component}.json`
const command = process.platform === "win32" ? "npx.cmd" : "npx"
const args = ["shadcn@latest", "add", url]

const child = spawn(command, args, { stdio: "inherit", shell: false })

child.on("exit", (code) => {
  process.exit(code ?? 1)
})

child.on("error", (error) => {
  console.error(`Falha ao executar comando: ${error.message}`)
  process.exit(1)
})
