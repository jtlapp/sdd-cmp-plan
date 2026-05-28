// Extract test/it/describe entries from a project's .test.ts files.
// Reads test files as plain text; regex is sufficient given how uniform
// the two projects' test syntax is (both use node:test).
//
// Usage:  node extract.js <projectRoot> <outputJson>
// Output JSON: { project, root, files: [{ path, tests: [{ kind, name, line }] }] }

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      walk(full, acc);
    } else if (st.isFile() && full.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

// Match: optional leading whitespace, optional `await ` or `void `, then
// `test(`, `it(`, or `describe(` (allowing `.only`, `.skip`, `.todo`),
// then a single/double/backtick-quoted string.
//
// We deliberately allow simple `${...}` interpolation in template literals
// by capturing everything up to the closing backtick. Escapes are handled
// for \" and \' via the alternation.
const TEST_RE = /^[ \t]*(?:await\s+|void\s+)?(test|it|describe)(?:\.(?:only|skip|todo))?\s*\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)/;

function extractTests(filePath) {
  const text = readFileSync(filePath, "utf8");
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TEST_RE);
    if (!m) continue;
    const kind = m[1];
    const name = m[2] ?? m[3] ?? m[4] ?? "";
    out.push({ kind, name, line: i + 1 });
  }
  return out;
}

function main() {
  const [, , projectRoot, outPath] = process.argv;
  if (!projectRoot || !outPath) {
    console.error("usage: node extract.js <projectRoot> <outputJson>");
    process.exit(1);
  }
  const testDir = join(projectRoot, "test");
  const files = walk(testDir).sort();
  const corpus = {
    project: relative(dirname(projectRoot), projectRoot),
    root: projectRoot,
    files: files.map((f) => ({
      path: relative(projectRoot, f),
      tests: extractTests(f),
    })),
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(corpus, null, 2));
  const total = corpus.files.reduce((n, f) => n + f.tests.length, 0);
  console.log(`${corpus.project}: ${corpus.files.length} files, ${total} tests -> ${outPath}`);
}

main();
