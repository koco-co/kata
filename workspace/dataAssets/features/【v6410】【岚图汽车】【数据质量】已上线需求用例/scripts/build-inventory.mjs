#!/usr/bin/env bun
// 从 archive md 生成 results/inventory.json，供 tests/cases/lr-*.ts 在 module load 时做一致性校验。
// area 由需求名（### section）的【模块】前缀内容分类，不再依赖 LR-ID 区间。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 期望计数 = 按现有 md 重算的真值快照，用于回归防漂移；改 md 数据后按脚本打印的实际分布更新。
const EXPECTED_CASE_COUNT = 1217;
const EXPECTED_AREA_COUNTS = {
  quality: 1088,
  standard: 76,
  assets: 33,
  metadata: 12,
  security: 8,
  platform: 0,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultArchive = resolve(featureDir, "岚图已上线需求用例.md");
const defaultOutput = resolve(featureDir, "results/inventory.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { archive: defaultArchive, output: defaultOutput };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--archive") {
      options.archive = resolve(args[++index]);
    } else if (arg === "--output") {
      options.output = resolve(args[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

// area 按需求名（### section）的【模块】前缀内容分类，与产品模块对齐：
//   数据资产→assets、数据标准→standard、数据地图→metadata、含权限点→security、其余→quality。
// 无【模块】前缀的需求（多为数据质量内容）归 quality。platform 当前数据无命中，保留桶以兼容测试层。
function assignArea(section) {
  const text = String(section ?? "");
  if (/权限点|权限控制/.test(text)) return "security";
  if (/数据资产/.test(text)) return "assets";
  if (/数据标准/.test(text)) return "standard";
  if (/数据地图/.test(text)) return "metadata";
  if (/公共管理|平台管理/.test(text)) return "platform";
  return "quality";
}

// ─── 以下两个函数从 audit-launched-reqs-cases.mjs 原样复制 ───

function splitMarkdownTableRow(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.startsWith("|")) return [];
  const source = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buffer = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "|" && source[index - 1] !== "\\") {
      cells.push(buffer.replace(/\\\|/g, "|").trim());
      buffer = "";
    } else {
      buffer += char;
    }
  }
  cells.push(buffer.replace(/\\\|/g, "|").trim());

  return cells;
}

function parseCases(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const cases = [];
  let version = "";
  let section = "";
  let current = null;
  let outerFence = null;

  function finishCase(endLine) {
    if (!current) return;
    current.endLine = endLine;
    current.body = current.lines.join("\n");
    cases.push(current);
    current = null;
  }

  function parseFence(line) {
    const match = line.trim().match(/^(`{3,}|~{3,})/);
    return match ? { marker: match[1][0], length: match[1].length } : null;
  }

  function updateOuterFence(line) {
    const fence = parseFence(line);
    if (!fence) return;
    if (!outerFence) {
      outerFence = fence;
      return;
    }
    if (fence.marker === outerFence.marker && fence.length >= outerFence.length) {
      outerFence = null;
    }
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (outerFence) {
      if (current) current.lines.push(line);
      updateOuterFence(line);
      return;
    }

    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      finishCase(lineNumber - 1);
      version = versionMatch[1];
      section = "";
      updateOuterFence(line);
      return;
    }

    const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (sectionMatch) {
      finishCase(lineNumber - 1);
      section = sectionMatch[1].trim();
      updateOuterFence(line);
      return;
    }

    const titleMatch = line.match(/^#####\s+【(P[0-3])】(.+?)\s*$/);
    if (titleMatch) {
      finishCase(lineNumber - 1);
      current = {
        index: cases.length + 1,
        line: lineNumber,
        endLine: lineNumber,
        version,
        section,
        priority: titleMatch[1],
        title: line.replace(/^#####\s+/, "").trim(),
        lines: [line],
        body: "",
        preconditions: "",
        preconditionLines: [],
        steps: [],
        preconditionHeaderCount: 0,
        stepsHeaderCount: 0,
        preconditionFenceLine: "",
        preconditionFenceLineNumber: null,
      };
      updateOuterFence(line);
      return;
    }

    if (current) current.lines.push(line);
    updateOuterFence(line);
  });
  finishCase(lines.length);

  for (const testCase of cases) {
    const blockLines = testCase.lines;
    testCase.preconditionHeaderCount = blockLines.filter(
      (line) => line.trim() === "> 前置条件",
    ).length;
    testCase.stepsHeaderCount = blockLines.filter(
      (line) => line.trim() === "> 用例步骤",
    ).length;

    const preIndex = blockLines.findIndex((line) => line.trim() === "> 前置条件");
    const stepsIndex = blockLines.findIndex((line) => line.trim() === "> 用例步骤");
    if (preIndex !== -1 && stepsIndex !== -1 && stepsIndex > preIndex) {
      const preLines = blockLines.slice(preIndex + 1, stepsIndex);
      const fenceIndex = preLines.findIndex((line) => /^`{3,}/.test(line.trim()));
      if (fenceIndex !== -1) {
        testCase.preconditionFenceLine = preLines[fenceIndex].trim();
        testCase.preconditionFenceLineNumber = testCase.line + preIndex + 1 + fenceIndex;
        const fence = testCase.preconditionFenceLine.match(/^(`{3,})/)?.[1] ?? "";
        const closeIndex = preLines.findIndex(
          (line, index) => index > fenceIndex && line.trim() === fence,
        );
        const contentStart = fenceIndex + 1;
        const contentEnd = closeIndex === -1 ? preLines.length : closeIndex;
        testCase.preconditionLines = preLines
          .slice(contentStart, contentEnd)
          .map((line, offset) => ({
            line: testCase.line + preIndex + 1 + contentStart + offset,
            text: line,
          }));
        testCase.preconditions =
          closeIndex === -1
            ? preLines.slice(contentStart).join("\n").trim()
            : preLines.slice(contentStart, closeIndex).join("\n").trim();
      } else {
        testCase.preconditionLines = preLines.map((line, offset) => ({
          line: testCase.line + preIndex + 1 + offset,
          text: line,
        }));
        testCase.preconditions = preLines.join("\n").trim();
      }
    }

    if (stepsIndex !== -1) {
      for (const [offset, line] of blockLines.slice(stepsIndex + 1).entries()) {
        if (!line.trim().startsWith("|")) continue;
        if (/^\|\s*编号\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) continue;
        const cells = splitMarkdownTableRow(line);
        if (cells.length < 3) continue;
        testCase.steps.push({
          line: testCase.line + stepsIndex + 1 + offset,
          number: cells[0],
          step: cells[1],
          expected: cells.slice(2).join("|"),
        });
      }
    }
  }

  return cases;
}

// ─── 生成 inventory ───

function buildInventory(cases) {
  return cases.map((c) => {
    const padded = String(c.index).padStart(4, "0");
    return {
      id: `LR-${padded}`,
      source_ref: `src.case.archive.${padded}@1`,
      title: c.title,
      area: assignArea(c.section),
      version: c.version,
      priority: c.priority,
      line: c.line,
      section: c.section,
    };
  });
}

function validate(inventoryCases) {
  if (inventoryCases.length !== EXPECTED_CASE_COUNT) {
    throw new Error(
      `Total case count mismatch: expected=${EXPECTED_CASE_COUNT} actual=${inventoryCases.length}`,
    );
  }

  const areaCounts = {};
  for (const c of inventoryCases) {
    areaCounts[c.area] = (areaCounts[c.area] ?? 0) + 1;
  }
  // area 计数对真值快照；同时校验各 area 之和等于总数（防止漏桶）。
  let areaSum = 0;
  for (const [area, expected] of Object.entries(EXPECTED_AREA_COUNTS)) {
    const actual = areaCounts[area] ?? 0;
    if (actual !== expected) {
      throw new Error(`Area "${area}": expected=${expected} actual=${actual}`);
    }
    areaSum += actual;
  }
  if (areaSum !== inventoryCases.length) {
    throw new Error(`Area buckets sum ${areaSum} != total ${inventoryCases.length}（有未登记的 area 桶）`);
  }
}

function main() {
  const options = parseArgs();
  const markdown = readFileSync(options.archive, "utf8");
  const cases = parseCases(markdown);
  const inventoryCases = buildInventory(cases);
  validate(inventoryCases);

  const inventory = { cases: inventoryCases };
  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, `${JSON.stringify(inventory, null, 2)}\n`);

  const areaCounts = {};
  for (const c of inventoryCases) {
    areaCounts[c.area] = (areaCounts[c.area] ?? 0) + 1;
  }
  console.log(
    JSON.stringify({ output: options.output, total: inventoryCases.length, areaCounts }, null, 2),
  );
}

try {
  main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
