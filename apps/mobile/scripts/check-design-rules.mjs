// Fails when UI code breaks the visual rules that theme tokens cannot enforce.
// The rules themselves are in CONTRIBUTING.md, under "Visual system".
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

const SOURCE_DIR = join(import.meta.dirname, "../src")
const GENERATED_FILES = new Set(["routeTree.gen.ts"])

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"
const COLOR_UTILITIES =
  "bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|accent|caret"

const RULES = [
  {
    name: "font weight above medium",
    pattern: /(?<![\w-])font-(?:semibold|bold|extrabold|black)(?![\w-])/g,
    fix: "Use font-light for display text and font-medium for labels and small titles.",
  },
  {
    name: "color outside the theme",
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOR_UTILITIES})-(?:black|white|(?:${PALETTE})-\\d{2,3})(?![\\w-])`,
      "g"
    ),
    fix: "Use a theme token: bg-background, text-foreground, bg-primary, border-border…",
  },
  {
    name: "arbitrary color",
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOR_UTILITIES})-\\[(?:#|rgb|hsl|oklch|oklab)[^\\]]*\\]`,
      "g"
    ),
    fix: "Add the color to the theme in src/global.css and use its token.",
  },
]

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    const isSource = /\.tsx?$/.test(entry.name)
    return isSource && !GENERATED_FILES.has(entry.name) ? [path] : []
  })
}

const violations = []
for (const file of sourceFiles(SOURCE_DIR)) {
  const lines = readFileSync(file, "utf8").split("\n")
  for (const [index, line] of lines.entries()) {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        violations.push(
          `${relative(process.cwd(), file)}:${index + 1}  ${match[0]}  (${rule.name}) ${rule.fix}`
        )
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `Design rules: ${violations.length} violation(s). See "Visual system" in CONTRIBUTING.md.\n`
  )
  console.error(violations.join("\n"))
  process.exit(1)
}
console.log("Design rules: no violations.")
