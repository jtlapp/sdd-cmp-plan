// Group extracted test corpora into per-area JSON files.
//
// Reads:
//   ../extracted/areas.json
//   ../extracted/cc-only.json
//   ../extracted/cc-openspec.json
//
// Writes:
//   ../extracted/by-area/<area>.json     -- per-area combined corpus
//   ../extracted/coverage.json           -- audit: which files matched, which didn't
//
// Usage:  node group.js

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const extractedDir = resolve(here, "../extracted");
const byAreaDir = join(extractedDir, "by-area");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function globToRegex(glob) {
  // Escape regex metachars except * and /
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") { re += ".*"; i++; }
      else { re += "[^/]*"; }
    } else if (/[.+^$(){}|[\]\\?]/.test(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

function matchesAny(path, patterns) {
  return patterns.some((p) => globToRegex(p).test(path));
}

function main() {
  const areasDoc = readJson(join(extractedDir, "areas.json"));
  const ccOnly = readJson(join(extractedDir, "cc-only.json"));
  const ccOpenspec = readJson(join(extractedDir, "cc-openspec.json"));

  mkdirSync(byAreaDir, { recursive: true });

  const matchedCcOnly = new Set();
  const matchedCcOpenspec = new Set();

  for (const area of areasDoc.areas) {
    const ccOnlyFiles = ccOnly.files.filter((f) => matchesAny(f.path, area.ccOnly));
    const ccOpenspecFiles = ccOpenspec.files.filter((f) => matchesAny(f.path, area.ccOpenspec));
    ccOnlyFiles.forEach((f) => matchedCcOnly.add(f.path));
    ccOpenspecFiles.forEach((f) => matchedCcOpenspec.add(f.path));

    const out = {
      area: area.name,
      scope: area.scope,
      ccOnly: {
        project: ccOnly.project,
        root: ccOnly.root,
        files: ccOnlyFiles,
        testCount: ccOnlyFiles.reduce((n, f) => n + f.tests.length, 0),
      },
      ccOpenspec: {
        project: ccOpenspec.project,
        root: ccOpenspec.root,
        files: ccOpenspecFiles,
        testCount: ccOpenspecFiles.reduce((n, f) => n + f.tests.length, 0),
      },
    };
    writeFileSync(join(byAreaDir, `${area.name}.json`), JSON.stringify(out, null, 2));
    console.log(
      `${area.name.padEnd(24)} cc-only: ${String(ccOnlyFiles.length).padStart(2)} files / ${String(out.ccOnly.testCount).padStart(3)} tests` +
      `   cc-openspec: ${String(ccOpenspecFiles.length).padStart(2)} files / ${String(out.ccOpenspec.testCount).padStart(3)} tests`
    );
  }

  const unmatchedCcOnly = ccOnly.files.map((f) => f.path).filter((p) => !matchedCcOnly.has(p));
  const unmatchedCcOpenspec = ccOpenspec.files.map((f) => f.path).filter((p) => !matchedCcOpenspec.has(p));

  const coverage = {
    ccOnly: {
      total: ccOnly.files.length,
      matched: matchedCcOnly.size,
      unmatched: unmatchedCcOnly,
    },
    ccOpenspec: {
      total: ccOpenspec.files.length,
      matched: matchedCcOpenspec.size,
      unmatched: unmatchedCcOpenspec,
    },
  };
  writeFileSync(join(extractedDir, "coverage.json"), JSON.stringify(coverage, null, 2));

  console.log("");
  console.log(`cc-only:     ${matchedCcOnly.size}/${ccOnly.files.length} files matched, ${unmatchedCcOnly.length} unmatched`);
  if (unmatchedCcOnly.length) console.log("  unmatched: " + unmatchedCcOnly.join(", "));
  console.log(`cc-openspec: ${matchedCcOpenspec.size}/${ccOpenspec.files.length} files matched, ${unmatchedCcOpenspec.length} unmatched`);
  if (unmatchedCcOpenspec.length) console.log("  unmatched: " + unmatchedCcOpenspec.join(", "));
}

main();
