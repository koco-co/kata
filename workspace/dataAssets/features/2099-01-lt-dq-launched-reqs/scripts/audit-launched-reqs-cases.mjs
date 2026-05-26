#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_CASE_COUNT = 1216;
const EXPECTED_VERSION_COUNTS = {
  "v6.4.10": 278,
  "v6.4.2": 88,
  "v6.4.3": 297,
  "v6.4.4": 132,
  "v6.4.5": 60,
  "v6.4.6": 117,
  "v6.4.8": 244,
};
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
const WEAK_EXPECTED_ONLY = new Set([
  "进入成功",
  "保存成功",
  "查询成功",
  "操作成功",
  "页面正常打开",
  "页面正常加载",
  "正常显示",
  "展示正常",
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultArchive = resolve(featureDir, "岚图已上线需求主流程用例.md");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    archive: defaultArchive,
    jsonOut: "",
    strict: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--archive" || arg === "--json-out") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      if (arg === "--archive") options.archive = resolve(value);
      if (arg === "--json-out") options.jsonOut = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
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
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\\\|/g, "|")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function parseFrontmatterCaseCount(markdown) {
  const match = String(markdown ?? "").match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const countMatch = match[1].match(/^case_count:\s*(\d+)\s*$/m);
  return countMatch ? Number(countMatch[1]) : null;
}

function parseCases(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const cases = [];
  let version = "";
  let section = "";
  let current = null;

  function finishCase(endLine) {
    if (!current) return;
    current.endLine = endLine;
    current.body = current.lines.join("\n");
    cases.push(current);
    current = null;
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      finishCase(lineNumber - 1);
      version = versionMatch[1];
      section = "";
      return;
    }

    const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (sectionMatch) {
      finishCase(lineNumber - 1);
      section = sectionMatch[1].trim();
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
        steps: [],
        preconditionHeaderCount: 0,
        stepsHeaderCount: 0,
        preconditionFenceLine: "",
      };
      return;
    }

    if (current) current.lines.push(line);
  });
  finishCase(lines.length);

  for (const testCase of cases) {
    const blockLines = testCase.lines;
    testCase.preconditionHeaderCount = blockLines.filter((line) => line.trim() === "> 前置条件").length;
    testCase.stepsHeaderCount = blockLines.filter((line) => line.trim() === "> 用例步骤").length;

    const preIndex = blockLines.findIndex((line) => line.trim() === "> 前置条件");
    const stepsIndex = blockLines.findIndex((line) => line.trim() === "> 用例步骤");
    if (preIndex !== -1 && stepsIndex !== -1 && stepsIndex > preIndex) {
      const preLines = blockLines.slice(preIndex + 1, stepsIndex);
      const fenceIndex = preLines.findIndex((line) => /^`{3,}/.test(line.trim()));
      if (fenceIndex !== -1) {
        testCase.preconditionFenceLine = preLines[fenceIndex].trim();
        const fence = testCase.preconditionFenceLine.match(/^(`{3,})/)?.[1] ?? "";
        const closeIndex = preLines.findIndex(
          (line, index) => index > fenceIndex && line.trim() === fence,
        );
        testCase.preconditions =
          closeIndex === -1
            ? preLines.slice(fenceIndex + 1).join("\n").trim()
            : preLines.slice(fenceIndex + 1, closeIndex).join("\n").trim();
      } else {
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

function classifyIssues(markdown, cases) {
  const issues = [];
  const frontmatterCaseCount = parseFrontmatterCaseCount(markdown);
  const versionCounts = {};
  for (const testCase of cases) {
    versionCounts[testCase.version] = (versionCounts[testCase.version] ?? 0) + 1;
  }

  function add(rule, message, details = {}) {
    issues.push({ rule, message, ...details });
  }

  if (frontmatterCaseCount !== EXPECTED_CASE_COUNT) {
    add("frontmatter_case_count", `frontmatter case_count is ${frontmatterCaseCount}`, {
      expected: EXPECTED_CASE_COUNT,
      actual: frontmatterCaseCount,
    });
  }

  if (cases.length !== EXPECTED_CASE_COUNT) {
    add("case_count", `parsed case count is ${cases.length}`, {
      expected: EXPECTED_CASE_COUNT,
      actual: cases.length,
    });
  }

  for (const [version, expected] of Object.entries(EXPECTED_VERSION_COUNTS)) {
    const actual = versionCounts[version] ?? 0;
    if (actual !== expected) {
      add("version_case_count", `${version} case count is ${actual}`, {
        version,
        expected,
        actual,
      });
    }
  }

  for (const testCase of cases) {
    const ref = {
      caseIndex: testCase.index,
      line: testCase.line,
      version: testCase.version,
      title: testCase.title,
    };

    if (testCase.preconditionHeaderCount !== 1) {
      add("precondition_header_count", "case must contain exactly one precondition header", {
        ...ref,
        actual: testCase.preconditionHeaderCount,
      });
    }

    if (testCase.stepsHeaderCount !== 1) {
      add("steps_header_count", "case must contain exactly one steps header", {
        ...ref,
        actual: testCase.stepsHeaderCount,
      });
    }

    if (testCase.preconditionFenceLine && !/^`{3,}$/.test(testCase.preconditionFenceLine)) {
      add("precondition_fence_language", "precondition fence must not declare a language", {
        ...ref,
        fence: testCase.preconditionFenceLine,
      });
    }

    if (testCase.steps.length === 0) {
      add("missing_step_rows", "case has no step rows", ref);
    }

    testCase.steps.forEach((step, index) => {
      const actualNumber = Number(textOnly(step.number));
      const expectedNumber = index + 1;
      if (!Number.isInteger(actualNumber) || actualNumber !== expectedNumber) {
        add("step_number", "step number must be sequential", {
          ...ref,
          line: step.line,
          expected: expectedNumber,
          actual: step.number,
        });
      }

      const expectedText = textOnly(step.expected);
      if (/^\s*(?:\d+[.)）、]|[（(]\d+[）)])\s*/.test(expectedText)) {
        add("expected_numbering", "expected result should not start with a numbered list marker", {
          ...ref,
          line: step.line,
          actual: expectedText,
        });
      }

      if (WEAK_EXPECTED_ONLY.has(expectedText)) {
        add("weak_expected_only", "expected result is too weak when used alone", {
          ...ref,
          line: step.line,
          actual: expectedText,
        });
      }
    });

    const bodyText = textOnly([testCase.title, testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n"));
    if (/进入[「"][^」"\n]*(?:-|－|–|—)[^」"\n]*[」"]/.test(bodyText)) {
      add("old_navigation_quote_style", "navigation path should use 【模块 → 页面】 style", ref);
    }

    if (
      OLD_RULESET_VERSIONS.has(testCase.version) &&
      DQ_CHAIN_TERMS.some((term) => bodyText.includes(term)) &&
      !bodyText.includes("规则集管理")
    ) {
      add("pre_v648_dq_chain_missing_ruleset", "old DQ chain case mentions DQ task/report/result terms without ruleset management", ref);
    }

    if (/规则描述\s*[:：=]\s*(?:无|空|N\/A|NA|none)\b/i.test(bodyText)) {
      add("empty_rule_description", "rule description is empty or placeholder text", ref);
    }
  }

  return { issues, versionCounts };
}

function summarize(issues) {
  const issuesByRule = {};
  for (const issue of issues) {
    issuesByRule[issue.rule] = (issuesByRule[issue.rule] ?? 0) + 1;
  }
  return issuesByRule;
}

function main() {
  const options = parseArgs();
  const markdown = readFileSync(options.archive, "utf8");
  const frontmatterCaseCount = parseFrontmatterCaseCount(markdown);
  const cases = parseCases(markdown);
  const { issues, versionCounts } = classifyIssues(markdown, cases);
  const issuesByRule = summarize(issues);
  const summary = {
    archive: options.archive,
    caseCount: cases.length,
    expectedCaseCount: EXPECTED_CASE_COUNT,
    frontmatterCaseCount,
    versionCounts,
    expectedVersionCounts: EXPECTED_VERSION_COUNTS,
    issueCount: issues.length,
    issuesByRule,
  };
  const full = {
    ...summary,
    issues,
  };

  if (options.jsonOut) {
    writeFileSync(options.jsonOut, `${JSON.stringify(full, null, 2)}\n`);
  }

  console.log(JSON.stringify(summary));
  if (options.strict && issues.length > 0) {
    process.exitCode = 1;
  }
}

main();
