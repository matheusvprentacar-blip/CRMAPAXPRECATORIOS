import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const args = {
    owner: "codex",
    scope: "backend",
    status: "aberto",
    handoffTo: "usuario",
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);

    if (key === "dry-run") {
      args.dryRun = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    i += 1;
    args[key] = value;
  }

  if (!args.title) {
    throw new Error("Use --title \"titulo da tarefa\".");
  }

  if (!args.request) {
    args.request = args.title;
  }

  return args;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function nowParts() {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const fileTime = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return { date, time, fileTime };
}

function inferBackupOwner(owner) {
  return owner === "claude" ? "codex" : "claude";
}

function buildContent(args, fileName, createdAt) {
  const owner = args.owner.toLowerCase();
  const backupOwner = (args.backupOwner || inferBackupOwner(owner)).toLowerCase();
  const handoffTo = (args.handoffTo || "usuario").toLowerCase();

  return `---
title: Tarefa Compartilhada - ${args.title}
tags:
  - agentes
  - handoff
  - ${owner}
  - ${args.scope}
status: ${args.status}
owner: ${owner}
backup_owner: ${backupOwner}
scope: ${args.scope}
handoff_to: ${handoffTo}
created_at: ${createdAt}
updated_at: ${createdAt}
source_file: ${fileName}
---

# Tarefa Compartilhada - ${args.title}

## Pedido do Usuário

${args.request}

## Responsabilidade

- Agente atual: ${owner}
- Agente de apoio: ${backupOwner}
- Escopo principal: ${args.scope}
- Handoff para: ${handoffTo}
- Status: ${args.status}

## Contexto consultado

- [[🏠 Índice]]
- [ ] Nota principal do módulo
- [ ] Nota de processo relacionada
- [ ] Nota de banco de dados, se aplicável

## Plano

- [ ] Entender o pedido e o contexto
- [ ] Executar a mudança
- [ ] Atualizar documentação temática
- [ ] Preparar handoff ou encerramento

## Log do Codex

### ${createdAt}
- Status:
- O que foi feito:
- Arquivos alterados:
- Testes:
- Bloqueios:
- Próximo passo:

## Log do Claude

### ${createdAt}
- Status:
- O que foi feito:
- Arquivos alterados:
- Testes:
- Bloqueios:
- Próximo passo:

## Estado Atual

- Resumo:
- Próxima ação:
- Próximo agente:
- Pendências:
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { date, time, fileTime } = nowParts();
  const slug = args.slug || slugify(args.title);
  const fileName = `${date}-${fileTime}-${slug}.md`;
  const relativeDir = args.dest || path.join("CRM APAX", "Agentes", "Tarefas");
  const absoluteDir = path.resolve(relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);
  const createdAt = `${date} ${time}`;
  const content = buildContent(args, fileName, createdAt);

  if (args.dryRun) {
    console.log(absolutePath);
    console.log("-----");
    console.log(content);
    return;
  }

  fs.mkdirSync(absoluteDir, { recursive: true });

  if (fs.existsSync(absolutePath)) {
    throw new Error(`File already exists: ${absolutePath}`);
  }

  fs.writeFileSync(absolutePath, content, "utf8");
  console.log(absolutePath);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
