#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");
const defaultOut = resolve(featureDir, "../../../../docs/superpowers/plans/.process/2026-05-26-lt-dq-launched-reqs-stage4-sampling.md");
const SAMPLE_SIZE = 10;
const VERSION_ORDER = ["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6", "v6.4.8", "v6.4.10"];

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return resolve(value);
}

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

function textOnly(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseCases(markdown) {
  const cases = [];
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  let version = "";
  let current = null;
  let section = "";
  let inFence = false;
  let fenceMarker = "";

  function flush() {
    if (current) cases.push(current);
    current = null;
    section = "";
    inFence = false;
    fenceMarker = "";
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      flush();
      version = versionMatch[1];
      return;
    }
    const caseMatch = line.match(/^#####\s+【(P[0-3])】(.+?)\s*$/);
    if (caseMatch) {
      flush();
      current = {
        line: lineNumber,
        version,
        priority: caseMatch[1],
        title: caseMatch[2].trim(),
        preconditionHasComment: false,
        preconditionHasSchema: false,
        preconditionHasExpectedSelect: false,
        steps: [],
        hasRulesetChain: false,
        hasTodo: false,
      };
      return;
    }
    if (!current) return;

    if (/^>\s*前置条件/.test(line)) {
      section = "preconditions";
      return;
    }
    if (/^>\s*用例步骤/.test(line)) {
      section = "steps";
      return;
    }

    if (section === "preconditions") {
      const fence = line.match(/^(`{3,})(?:[A-Za-z0-9_-]+)?\s*$/);
      if (fence && !inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (inFence && line.trim() === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      } else if (inFence) {
        current.preconditionHasComment ||= /^\s*\/\*/.test(line);
        current.preconditionHasSchema ||= /\bUSE\s+\$\{SchemaA\}/i.test(line);
        current.preconditionHasExpectedSelect ||= /--\s*预期结果：\s*\d+/.test(line);
        current.hasRulesetChain ||= /规则集管理|规则包/.test(line);
        current.hasTodo ||= /待确认|TODO|FIXME/.test(line);
      }
      return;
    }

    if (section === "steps" && line.startsWith("|")) {
      if (/^\|\s*编号\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) return;
      const cells = splitMarkdownTableRow(line);
      if (cells.length >= 3) {
        const step = textOnly(cells[1]);
        const expected = textOnly(cells.slice(2).join("|"));
        current.steps.push({ step, expected });
        current.hasRulesetChain ||= /规则集管理|规则包/.test(`${step}\n${expected}`);
        current.hasTodo ||= /待确认|TODO|FIXME/.test(`${step}\n${expected}`);
      }
    }
  });
  flush();
  return cases;
}

function score(version, index) {
  let hash = 2166136261;
  const input = `${version}:${index}:lt-dq-launched-reqs-stage4`;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sampleByVersion(cases) {
  const result = [];
  for (const version of VERSION_ORDER) {
    const candidates = cases
      .map((testCase, index) => ({ testCase, index }))
      .filter((item) => item.testCase.version === version)
      .toSorted((left, right) => score(version, left.index) - score(version, right.index))
      .slice(0, SAMPLE_SIZE)
      .map((item) => item.testCase)
      .toSorted((left, right) => left.line - right.line);
    result.push(...candidates);
  }
  return result;
}

function reviewStatus(testCase) {
  const expectedNumbering = testCase.steps.every((step) => /^1\)/.test(step.expected));
  const noWeakTemplate = testCase.steps.every(
    (step) => !/页面路由进入目标菜单|页面标题或列表主区域可见|页面提示操作成功|目标记录状态或列表内容按本次操作更新/.test(step.expected),
  );
  const noRawApiStep = testCase.steps.every((step) => !/\bcurl\b|(?:POST|GET|PUT|DELETE|PATCH)\s+\//i.test(step.step));
  const preconditionOk =
    testCase.preconditionHasComment && testCase.preconditionHasSchema && testCase.preconditionHasExpectedSelect;
  return {
    preconditionOk,
    expectedNumbering,
    noWeakTemplate,
    noRawApiStep,
    noTodo: !testCase.hasTodo,
    stepCount: testCase.steps.length,
    rulesetChainSeen: testCase.hasRulesetChain,
  };
}

function main() {
  const out = argValue("--out", defaultOut);
  const cases = parseCases(readFileSync(archivePath, "utf8"));
  const sampled = sampleByVersion(cases);
  const lines = [
    "# Stage 4 Sampling Review",
    "",
    "- Scope: deterministic sample, 10 cases per version, 70 cases total.",
    "- Seed: `lt-dq-launched-reqs-stage4`.",
    "- Checked: precondition SQL comment/schema/select expectation, numbered expected assertions, no weak expected template, no raw API/curl in UI steps, no TODO/FIXME/待确认.",
    "- This is static artifact review only; it is not real platform execution evidence.",
    "",
    "| Version | Line | Priority | Steps | Ruleset Chain Text | Result | Title |",
    "| --- | ---: | --- | ---: | --- | --- | --- |",
  ];

  for (const testCase of sampled) {
    const status = reviewStatus(testCase);
    const ok =
      status.preconditionOk &&
      status.expectedNumbering &&
      status.noWeakTemplate &&
      status.noRawApiStep &&
      status.noTodo &&
      status.stepCount > 0;
    lines.push(
      `| ${testCase.version} | ${testCase.line} | ${testCase.priority} | ${status.stepCount} | ${
        status.rulesetChainSeen ? "yes" : "no"
      } | ${ok ? "pass" : "review"} | ${testCase.title.replace(/\|/g, "\\|")} |`,
    );
  }

  writeFileSync(out, `${lines.join("\n")}\n`);
  console.log(JSON.stringify({ out, sampled: sampled.length }, null, 2));
}

main();
