import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const targetUrl = "https://precatorios.grupoapax.com";
const outDir = resolve(process.cwd(), "out");
const indexPath = resolve(outDir, "index.html");
const fallbackPath = resolve(outDir, "404.html");

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CRM APAX Precatorios - Migracao para Web</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #f2efe9 0%, #e8e2d8 45%, #ddd5c9 100%);
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
        color: #1f2a33;
      }
      main {
        width: min(760px, calc(100% - 40px));
        background: #f9f6ef;
        border: 1px solid #d4cabc;
        border-radius: 22px;
        padding: 36px 32px;
        box-shadow: 0 16px 48px rgba(41, 32, 20, 0.16);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
        line-height: 1.2;
      }
      p {
        margin: 0 0 10px;
        font-size: 18px;
        line-height: 1.55;
      }
      .link {
        margin-top: 18px;
        display: inline-block;
        background: #214f7a;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
        font-size: 18px;
        padding: 12px 18px;
        border-radius: 10px;
      }
      .hint {
        margin-top: 10px;
        color: #586574;
        font-size: 15px;
      }
      .url {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Aplicativo desktop descontinuado</h1>
      <p>Esta versao do CRM APAX foi encerrada e nao recebe mais uso no desktop.</p>
      <p>Para continuar, acesse pela versao web oficial:</p>
      <a class="link" href="${targetUrl}" target="_blank" rel="noopener noreferrer">${targetUrl}</a>
      <p class="hint">Se o link nao abrir automaticamente, copie e cole no Chrome: <span class="url">${targetUrl}</span></p>
    </main>
  </body>
</html>
`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await Promise.all([
  writeFile(indexPath, html, "utf8"),
  writeFile(fallbackPath, html, "utf8"),
]);

console.log(`Desktop shutdown page generated at ${indexPath}`);
