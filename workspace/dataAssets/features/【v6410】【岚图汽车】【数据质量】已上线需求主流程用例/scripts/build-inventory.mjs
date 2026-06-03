#!/usr/bin/env bun
// 从 archive md 生成 results/inventory.json，供 tests/cases/lr-*.ts 在 module load 时读取。
// 区域 ID 映射与 tests/data/*/、_shared/pages/security/ 里的 EXPECTED_IDS 常量严格对齐。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_CASE_COUNT = 1216;
const EXPECTED_AREA_COUNTS = {
  quality: 1018,
  metadata: 40,
  platform: 65,
  standard: 76,
  security: 6,
  assets: 11,
};
const EXPECTED_QUALITY_PRIORITY = { P0: 246, P1: 473, P2: 299 };

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultArchive = resolve(featureDir, "岚图已上线需求主流程用例.md");
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

// 区域 ID 边界（与各 tests/data/* 和 security-permission-page.ts 的常量严格对齐）
function assignArea(numericId) {
  // assets: LR-0001, LR-0023, LR-0024, LR-0155..LR-0162（共 11 个）
  // LR-0155..LR-0162 与 lr-assets-full.ts 测试的 0157..0162 同属一个 md section，
  // LR-0001 来自 v6.4.10 数据资产 section；LR-0023/0024 来自数据地图字段结果页。
  if (
    numericId === 1 ||
    numericId === 23 ||
    numericId === 24 ||
    (numericId >= 155 && numericId <= 162)
  )
    return "assets";

  // metadata: LR-0015..LR-0022, LR-0025, LR-0026, LR-0375..LR-0401, LR-0806..LR-0808（共 40 个）
  if (
    (numericId >= 15 && numericId <= 22) ||
    numericId === 25 ||
    numericId === 26 ||
    (numericId >= 375 && numericId <= 401) ||
    (numericId >= 806 && numericId <= 808)
  )
    return "metadata";

  // platform: LR-0027..LR-0067, LR-0417..LR-0437, LR-0453..LR-0455（共 65 个）
  if (
    (numericId >= 27 && numericId <= 67) ||
    (numericId >= 417 && numericId <= 437) ||
    (numericId >= 453 && numericId <= 455)
  )
    return "platform";

  // standard: LR-0855..LR-0930（共 76 个）
  if (numericId >= 855 && numericId <= 930) return "standard";

  // security: LR-0771..LR-0776（共 6 个，对应 CURRENT_ADMIN_DQ_TARGETS 六个权限控制用例）
  if (numericId >= 771 && numericId <= 776) return "security";

  // 其余全部为 quality（共 1018 个）
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
      area: assignArea(c.index),
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
  for (const [area, expected] of Object.entries(EXPECTED_AREA_COUNTS)) {
    const actual = areaCounts[area] ?? 0;
    if (actual !== expected) {
      throw new Error(`Area "${area}": expected=${expected} actual=${actual}`);
    }
  }

  const qualityCases = inventoryCases.filter((c) => c.area === "quality");
  const priorityCounts = { P0: 0, P1: 0, P2: 0 };
  for (const c of qualityCases) {
    if (c.priority in priorityCounts) priorityCounts[c.priority]++;
  }
  for (const [p, expected] of Object.entries(EXPECTED_QUALITY_PRIORITY)) {
    if (priorityCounts[p] !== expected) {
      throw new Error(
        `Quality priority ${p}: expected=${expected} actual=${priorityCounts[p]}`,
      );
    }
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
