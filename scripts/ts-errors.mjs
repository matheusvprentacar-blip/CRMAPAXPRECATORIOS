#!/usr/bin/env node
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

function flattenMessageText(messageText) {
  return ts.flattenDiagnosticMessageText(messageText, "\n");
}

function findTsConfig(cwd) {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    console.error("❌ tsconfig.json não encontrado a partir de:", cwd);
    process.exit(1);
  }
  return configPath;
}

function loadProgram(tsconfigPath) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    console.error("❌ Erro ao ler tsconfig:", flattenMessageText(configFile.error.messageText));
    process.exit(1);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );

  // ✅ Para diagnóstico (sem emitir build), desativamos incremental/composite
  // Isso evita TS5074 em alguns projetos.
  parsed.options = {
    ...parsed.options,
    incremental: false,
    composite: false,
    tsBuildInfoFile: undefined,
  };

  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
}

function formatDiag(d) {
  let filePath = "";
  let line = 0;
  let col = 0;

  if (d.file && typeof d.start === "number") {
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    filePath = path.relative(process.cwd(), d.file.fileName);
    line = pos.line + 1;
    col = pos.character + 1;
  }

  return {
    code: d.code,
    category: ts.DiagnosticCategory[d.category],
    file: filePath || undefined,
    line: filePath ? line : undefined,
    col: filePath ? col : undefined,
    message: flattenMessageText(d.messageText),
  };
}

function main() {
  const cwd = process.cwd();
  const tsconfigPath = findTsConfig(cwd);
  const program = loadProgram(tsconfigPath);

  const diagnostics = ts.getPreEmitDiagnostics(program);
  const items = diagnostics.map(formatDiag);

  // Resumo por código
  const countsByCode = {};
  for (const it of items) {
    const key = String(it.code);
    countsByCode[key] = (countsByCode[key] || 0) + 1;
  }

  // Mostrar no console
  for (const it of items) {
    if (it.file) {
      console.log(`${it.file}:${it.line}:${it.col} TS${it.code}: ${it.message}`);
    } else {
      console.log(`TS${it.code}: ${it.message}`);
    }
  }

  console.log("\n--- RESUMO ---");
  console.log("Total de erros/avisos:", items.length);
  const sorted = Object.entries(countsByCode).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sorted.slice(0, 20)) {
    console.log(`TS${code}: ${count}`);
  }

  // Salvar JSON
  const out = {
    generatedAt: new Date().toISOString(),
    tsconfig: path.relative(cwd, tsconfigPath),
    total: items.length,
    countsByCode,
    diagnostics: items,
  };

  fs.writeFileSync("ts-errors.json", JSON.stringify(out, null, 2), "utf-8");
  console.log("\n✅ Gerado: ts-errors.json");
}

main();
