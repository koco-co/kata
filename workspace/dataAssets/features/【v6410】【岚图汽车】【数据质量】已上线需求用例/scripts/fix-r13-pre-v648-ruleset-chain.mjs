#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OLD_RULESET_VERSIONS = new Set(["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6"]);
const DQ_CHAIN_TERMS = [
  "规则任务",
  "监控规则",
  "校验结果",
  "数据质量报告",
  "规则调度",
  "运行方式",
  "分区信息",
  "质量评估汇总",
  "脏数据明细",
];
const CHAIN_SENTENCE =
  "4. 规则任务来源：本用例中的既有或新建规则任务需先在【数据质量 → 规则集管理】按相同数据源、数据库、数据表准备规则集和规则包，再在【数据质量 → 规则任务管理】通过「导入规则包」引用为可执行规则任务。";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

function shouldPatch(block, version) {
  if (!OLD_RULESET_VERSIONS.has(version)) return false;
  if (block.includes(CHAIN_SENTENCE)) return false;
  const body = block.replace(/<br\s*\/?>/gi, "\n");
  const isDataStandardCheckCase = body.includes("数据标准") && body.includes("落标检查");
  if (isDataStandardCheckCase) return false;
  return DQ_CHAIN_TERMS.some((term) => body.includes(term));
}

function patchPreconditionComment(block) {
  return block.replace(/(\/\*[\s\S]*?)(\n\*\/\nUSE\s+\$\{SchemaA\};)/, (_match, comment, suffix) => {
    if (comment.includes(CHAIN_SENTENCE)) return `${comment}${suffix}`;
    return `${comment}\n${CHAIN_SENTENCE}${suffix}`;
  });
}

function normalizeArchive(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let version = "";
  let currentCase = [];
  let patched = 0;

  function flushCase() {
    if (currentCase.length === 0) return;
    const block = currentCase.join("\n");
    if (shouldPatch(block, version)) {
      const next = patchPreconditionComment(block);
      if (next !== block) {
        output.push(next);
        patched += 1;
      } else {
        output.push(block);
      }
    } else {
      output.push(block);
    }
    currentCase = [];
  }

  for (const line of lines) {
    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      flushCase();
      version = versionMatch[1];
      output.push(line);
      continue;
    }
    if (/^#####\s+【P[0-3]】/.test(line)) {
      flushCase();
      currentCase = [line];
      continue;
    }
    if (currentCase.length > 0) {
      currentCase.push(line);
    } else {
      output.push(line);
    }
  }
  flushCase();
  return { markdown: output.join("\n"), patched };
}

const before = readFileSync(archivePath, "utf8");
const { markdown, patched } = normalizeArchive(before);
if (markdown !== before) writeFileSync(archivePath, markdown);
console.log(JSON.stringify({ patched }));
