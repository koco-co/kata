#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

const markdown = readFileSync(archivePath, "utf8");
let replacements = 0;

let next = markdown.replace(/^###\s+【([^】]+)】(.+?)\s*$/gm, (_match, moduleName, subsectionName) => {
  replacements += 1;
  return `### ${moduleName.trim()}\n\n#### ${subsectionName.trim()}\n`;
});

next = next.replace(/^(#### .+)\n(##### )/gm, (_match, subsection, caseHeading) => {
  replacements += 1;
  return `${subsection}\n\n${caseHeading}`;
});

if (next === markdown) {
  console.log("R6 replacements: 0");
  process.exit(0);
}

writeFileSync(archivePath, next);
console.log(`R6 replacements: ${replacements}`);
