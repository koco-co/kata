#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");
const cjkPattern = /[\u3400-\u9fff]/;

function normalizeAsciiUiBrackets(line) {
  return line.replace(/\[([^\]\n]{1,80})\]/g, (match, label) => {
    const trimmed = label.trim();
    if (!cjkPattern.test(trimmed)) return match;
    if (/^[-+]?\d+(?:\.\d+)?\s*[,，]\s*[-+]?\d+(?:\.\d+)?$/.test(trimmed)) return match;
    return `「${trimmed}」`;
  });
}

const markdown = readFileSync(archivePath, "utf8");
let changedRows = 0;
const next = markdown
  .split("\n")
  .map((line) => {
    if (!line.startsWith("|") || /^\|\s*(编号|-+)/.test(line)) return line;
    const converted = normalizeAsciiUiBrackets(line);
    if (converted !== line) changedRows += 1;
    return converted;
  })
  .join("\n");

if (next === markdown) {
  console.log("R3 changed rows: 0");
  process.exit(0);
}

writeFileSync(archivePath, next);
console.log(`R3 changed rows: ${changedRows}`);
