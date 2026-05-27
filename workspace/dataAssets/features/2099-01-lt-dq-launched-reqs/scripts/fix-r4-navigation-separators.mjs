#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");
const dashPattern = /\s*[-－–—]\s*/;

let replacements = 0;

function normalizeBracketChain(line) {
  return line.replace(/【[^】]+】(?:\s*[-－–—]\s*【[^】]+】)+/g, (match) => {
    const parts = Array.from(match.matchAll(/【([^】]+)】/g), (item) => item[1].trim()).filter(Boolean);
    if (parts.length < 2) return match;
    replacements += 1;
    return `【${parts.join(" → ")}】`;
  });
}

function normalizeSingleBracketNavigation(line) {
  return line.replace(/(进入)【([^】]*[\u4e00-\u9fa5][^】]*[-－–—][^】]*)】(页面?)/g, (match, verb, path, suffix) => {
    const parts = path.split(dashPattern).map((item) => item.trim()).filter(Boolean);
    if (parts.length < 2) return match;
    replacements += 1;
    return `${verb}【${parts.join(" → ")}】${suffix}`;
  });
}

function normalizeTableRow(line) {
  return normalizeSingleBracketNavigation(normalizeBracketChain(line));
}

const markdown = readFileSync(archivePath, "utf8");
const next = markdown
  .split("\n")
  .map((line) => {
    if (!line.startsWith("|") || /^\|\s*(编号|-+)/.test(line)) return line;
    return normalizeTableRow(line);
  })
  .join("\n");

if (next === markdown) {
  console.log("R4 replacements: 0");
  process.exit(0);
}

writeFileSync(archivePath, next);
console.log(`R4 replacements: ${replacements}`);
