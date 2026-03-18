import fs from "node:fs"
import path from "node:path"

const ROOT_DIR = process.cwd()
const SCAN_DIRS = ["app", "components", "lib"]
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

const overlayTagPattern =
  /<(DialogContent|AlertDialogContent|SheetContent|SelectContent|DropdownMenuContent|DropdownMenuSubContent|PopoverContent|TooltipContent|Modal\.Dialog|HeroModal\.Dialog|HeroDropdownMenu|HeroDropdownPopover|Select\.Popover)\b/

const overlayConstantPattern =
  /^\s*const\s+([A-Za-z0-9_]+)\s*=/

const transparentTokenPattern =
  /(?:!?)bg-transparent|(?:!?)bg-(?:black|white|background|popover|card|content1|content2|muted|default(?:-\d+)?|zinc-\d+|\[[#a-zA-Z0-9(),.%\-\s:]+\])\/(?:[1-9]\d?|100)|dark:(?:!?)bg-(?:black|white|background|popover|card|content1|content2|muted|default(?:-\d+)?|zinc-\d+|\[[#a-zA-Z0-9(),.%\-\s:]+\])\/(?:[1-9]\d?|100)|backdrop-blur(?!-none)/

const ignoredConstantNames = [
  "backdrop",
  "header",
  "body",
  "footer",
  "icon",
  "close",
]

const findings = []

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) return

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      walk(entryPath)
      continue
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue
    inspectFile(entryPath)
  }
}

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (!transparentTokenPattern.test(line)) return

    const isOverlayTag = overlayTagPattern.test(line)
    const constantMatch = line.match(overlayConstantPattern)
    const constantName = constantMatch?.[1] ?? ""
    const isIgnoredConstant = ignoredConstantNames.some((fragment) =>
      constantName.toLowerCase().includes(fragment)
    )
    const isOverlayConstant =
      Boolean(constantName) &&
      !isIgnoredConstant &&
      /(modal|popover|dropdown|menu|dialog|tooltip|sheet)/i.test(constantName)

    if (!isOverlayTag && !isOverlayConstant) return

    findings.push({
      filePath: path.relative(ROOT_DIR, filePath),
      lineNumber: index + 1,
      line: line.trim(),
    })
  })
}

for (const scanDir of SCAN_DIRS) {
  walk(path.join(ROOT_DIR, scanDir))
}

if (findings.length === 0) {
  console.log("Overlay transparency audit passed with no findings.")
  process.exit(0)
}

console.error("Overlay transparency audit found potential issues:")
for (const finding of findings) {
  console.error(`- ${finding.filePath}:${finding.lineNumber}`)
  console.error(`  ${finding.line}`)
}

process.exit(1)
