import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src")
const catalog = new Map()
const problems = []
const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const numbers = (text) =>
  [...text.matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((m) => m[0].replace(/[.,]/g, ""))
    .sort()
const urls = (text) =>
  [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]).sort()
const signedNumbers = (text) =>
  [
    ...text
      .replaceAll("\u2212", "-")
      .matchAll(/(?<![\w\d])[-+]\d+(?:[.,]\d+)*/g),
  ]
    .map((match) => match[0].replace(/[.,]/g, ""))
    .sort()
const parse = (file) =>
  ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  )

for (const name of readdirSync(join(root, "locales")).filter((name) =>
  /^es-.*\.ts$/.test(name)
)) {
  const file = parse(join(root, "locales", name))
  const seen = new Set()
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) &&
      ts.isStringLiteral(node.initializer)
    ) {
      const source = node.name.text
      const target = node.initializer.text
      if (seen.has(source)) problems.push(`${name}: duplicate key ${source}`)
      seen.add(source)
      if (!target.trim()) problems.push(`${name}: empty translation ${source}`)
      for (const [label, extract] of [
        ["placeholders", placeholders],
        ["numbers", numbers],
        ["URLs", urls],
        ["signed numbers", signedNumbers],
      ]) {
        try {
          assert.deepEqual(extract(target), extract(source))
        } catch {
          problems.push(`${name}: changed ${label}: ${source}`)
        }
      }
      catalog.set(source, target)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert(seen.size > 0, `No translations found in ${name}`)
}

let literalCalls = 0
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "locales") inspect(path)
      continue
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name === "routeTree.gen.ts")
      continue
    const file = parse(path)
    function visit(node) {
      const presentationValue =
        ts.isJsxAttribute(node) &&
        node.name.getText(file) === "value" &&
        node.parent.parent.tagName?.getText(file) === "Stat"
      if (
        ts.isJsxAttribute(node) &&
        !presentationValue &&
        [
          "key",
          "value",
          "id",
          "name",
          "to",
          "href",
          "role",
          "type",
          "aria-current",
        ].includes(node.name.getText(file))
      ) {
        function hasTranslation(child) {
          if (
            ts.isCallExpression(child) &&
            ts.isIdentifier(child.expression) &&
            ["t", "translate"].includes(child.expression.text)
          ) {
            const { line } = file.getLineAndCharacterOfPosition(
              child.getStart()
            )
            problems.push(
              `${path}:${line + 1}: translated technical attribute ${node.name.getText(file)}`
            )
          }
          ts.forEachChild(child, hasTranslation)
        }
        ts.forEachChild(node, hasTranslation)
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["t", "translate"].includes(node.expression.text) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const source = node.arguments[0].text
        literalCalls += 1
        if (!catalog.has(source)) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart())
          problems.push(`${path}:${line + 1}: missing translation: ${source}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
}
inspect(root)
if (problems.length) {
  console.error(problems.slice(0, 40).join("\n"))
  console.error(`${problems.length} translation integrity/coverage problems`)
  process.exitCode = 1
} else {
  console.log(
    `Translations: ${catalog.size} entries; ${literalCalls} literal calls covered; numbers, URLs and placeholders preserved.`
  )
}
