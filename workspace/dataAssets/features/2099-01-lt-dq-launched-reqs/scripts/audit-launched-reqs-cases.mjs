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
const OLD_RULESET_UNSUPPORTED_TERMS = [
  "规则集管理",
  "新建规则集",
  "新增规则集",
  "编辑规则集",
  "导入规则包",
  "规则包名称",
  "规则包数量",
];
const DIRECT_EXECUTE_PATTERNS = [
  /点击任务【立即执行】/,
  /点击【立即执行】按钮/,
  /点击(?:任务|操作列|.*列表).*【立即执行】/,
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
const WEAK_EXPECTED_TEMPLATE_PHRASES = [
  "页面路由进入目标菜单",
  "页面标题或列表主区域可见",
  "页面提示操作成功",
  "目标记录状态或列表内容按本次操作更新",
];
const HALLUCINATED_FILLER_STEP_PATTERNS = [
  /^前提条件标示$/,
  /^前提标示$/,
  /^占位说明$/,
  /^操作占位$/,
];
const STEP_API_CALL_PATTERNS = [
  /\bcurl\b/i,
  /\bhttps?:\/\//,
  /\b(?:POST|GET|PUT|DELETE|PATCH)\s+\/[A-Za-z0-9_\-\/{}]+/,
];
const NAVIGATION_DASH_SEPARATOR = /【[^】]+】\s*[-－–—]\s*【[^】]+】/;
const BUTTON_BRACKET_TRAILING = /【[^】→]+】\s*按钮/;
const CLICK_BRACKET_NON_NAV = /(?:^|[^→])点击\s*【([^】]+)】/g;
const SELECT_BRACKET_NON_NAV = /(?:^|[^→])(?:选择|新增|新建|输入|配置|开启|关闭)\s*【([^】]+)】/g;
const SQUARE_BRACKET_BUTTON = /(?<![A-Za-z0-9_])\[([^\]\n]{1,30})\]/g;
const ENGLISH_BRACKETS_WHITELIST = new Set([
  "1.96",
  "-1.96",
  "P0",
  "P1",
  "P2",
  "P3",
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
    return match
      ? {
          marker: match[1][0],
          length: match[1].length,
        }
      : null;
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
    testCase.preconditionHeaderCount = blockLines.filter((line) => line.trim() === "> 前置条件").length;
    testCase.stepsHeaderCount = blockLines.filter((line) => line.trim() === "> 用例步骤").length;

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

  const subsectionHeaderCount = String(markdown ?? "")
    .split("\n")
    .filter((line) => /^####\s+\S/.test(line)).length;
  if (subsectionHeaderCount === 0) {
    add(
      "missing_subsection_header",
      "document must contain level-4 (####) subsection headers between module and case",
      { actual: subsectionHeaderCount },
    );
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

    if (testCase.preconditionFenceLine !== "```sql") {
      add("precondition_fence_language", "precondition fence must be exactly ```sql", {
        ...ref,
        line: testCase.preconditionFenceLineNumber ?? testCase.line,
        fence: testCase.preconditionFenceLine || null,
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
      if (!expectedText.startsWith("1)")) {
        add("expected_numbering", "expected result must start with literal 1)", {
          ...ref,
          line: step.line,
          actual: expectedText,
        });
      }

      const expectedWithoutLeadingNumber = expectedText.replace(/^1\)\s*/, "");
      if (WEAK_EXPECTED_ONLY.has(expectedWithoutLeadingNumber)) {
        add("weak_expected_only", "expected result is too weak when used alone", {
          ...ref,
          line: step.line,
          actual: expectedText,
        });
      }

      const stepText = textOnly(step.step);
      if (/^进入「(?:[^」]*[-－–—][^」]*|[^」]+」[-－–—]「[^」]+」)/.test(stepText)) {
        add("old_navigation_quote_style", "navigation step should use 【模块 → 页面】 style", {
          ...ref,
          line: step.line,
          actual: stepText,
        });
      }

      const stepAndExpected = `${stepText}\n${textOnly(step.expected)}`;

      for (const pattern of HALLUCINATED_FILLER_STEP_PATTERNS) {
        if (pattern.test(stepText.trim())) {
          add("hallucinated_filler_step", "step text appears to be auto-generated placeholder filler", {
            ...ref,
            line: step.line,
            actual: stepText,
          });
          break;
        }
      }

      if (STEP_API_CALL_PATTERNS.some((pattern) => pattern.test(stepAndExpected))) {
        add("step_contains_api_call", "step body must describe UI actions, not raw API/curl calls", {
          ...ref,
          line: step.line,
          actual: stepText,
        });
      }

      if (NAVIGATION_DASH_SEPARATOR.test(stepAndExpected)) {
        add("navigation_dash_separator", "navigation path between brackets must use ' → ', not '-'", {
          ...ref,
          line: step.line,
          actual: stepText,
        });
      }

      if (BUTTON_BRACKET_TRAILING.test(stepAndExpected)) {
        add("bracket_button_misuse", "button names must use 「」 not 【】 (matched: 【...】按钮)", {
          ...ref,
          line: step.line,
          actual: stepText,
        });
      }

      for (const regex of [CLICK_BRACKET_NON_NAV, SELECT_BRACKET_NON_NAV]) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(stepAndExpected)) !== null) {
          if (!match[1] || match[1].includes("→")) continue;
          add("bracket_button_misuse", "button names must use 「」 not 【】", {
            ...ref,
            line: step.line,
            actual: match[0].trim(),
          });
          break;
        }
      }

      let sbMatch;
      SQUARE_BRACKET_BUTTON.lastIndex = 0;
      while ((sbMatch = SQUARE_BRACKET_BUTTON.exec(stepAndExpected)) !== null) {
        const inside = sbMatch[1].trim();
        if (!inside || ENGLISH_BRACKETS_WHITELIST.has(inside)) continue;
        if (/^[-+]?\d+(?:[.,]\d+)?$/.test(inside)) continue;
        if (/^[A-Za-z0-9_\-.@]+$/.test(inside) && !/[一-鿿]/.test(inside)) continue;
        if (/^[-+]?\d+(?:\.\d+)?\s*[,，]\s*[-+]?\d+(?:\.\d+)?$/.test(inside)) continue;
        if (/^\\{1,2}u[0-9a-fA-F]{4}\s*-\s*\\{1,2}u[0-9a-fA-F]{4}$/.test(inside)) continue;
        add("ascii_bracket_button_misuse", "do not use [xxx] as button/field marker; use 「」", {
          ...ref,
          line: step.line,
          actual: `[${inside}]`,
        });
        break;
      }

      const expectedRaw = textOnly(step.expected);
      const expectedAfterNumber = expectedRaw.replace(/^\d+\)\s*/, "");
      if (WEAK_EXPECTED_TEMPLATE_PHRASES.some((phrase) => expectedAfterNumber.startsWith(phrase))) {
        add("weak_expected_template", "expected result uses a generic template phrase without case-specific assertion", {
          ...ref,
          line: step.line,
          actual: expectedRaw,
        });
      }

      const stepCell = String(step.step ?? "");
      const stepCellTextLen = textOnly(stepCell).length;
      const hasMultiSubpoints = /(?:^|[^0-9])\b[2-9]\)/.test(textOnly(stepCell));
      const hasLineBreak = /<br\s*\/?>/i.test(stepCell);
      if (stepCellTextLen > 80 && hasMultiSubpoints && !hasLineBreak) {
        add("step_cell_no_linebreak", "multi-subpoint step cell must use <br> between subpoints", {
          ...ref,
          line: step.line,
          actual: textOnly(stepCell).slice(0, 80),
        });
      }
    });

    const bodyText = textOnly([testCase.title, testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n"));
    const isDataStandardCheckCase = bodyText.includes("数据标准") && bodyText.includes("落标检查");
    if (!/^\s*\/\*/.test(testCase.preconditions)) {
      add("precondition_missing_comment_block", "precondition SQL must start with a /* ... */ comment block", ref);
    }

    if (!/\bUSE\s+\$\{SchemaA\}/i.test(testCase.preconditions)) {
      add("precondition_missing_schema_placeholder", "precondition SQL must use USE ${SchemaA}", ref);
    }

    if (!/--\s*预期结果：\s*\d+/.test(testCase.preconditions)) {
      add("precondition_missing_expected_select", "precondition SQL must include at least one SELECT expectation comment", ref);
    }

    if (/quality_test_db|qa_test|hive_test_db/.test(bodyText)) {
      add("hardcoded_schema", "case must not hardcode test database/schema names", ref);
    }

    if (/业务链路要求/.test(bodyText)) {
      add("generic_dq_chain_text", "case must not use generic DQ chain placeholder text", ref);
    }

    if (/新增并立即执行|保存并立即执行/.test(bodyText)) {
      add("old_save_and_execute_button", "case must not use removed save-and-execute button wording", ref);
    }

    if (DIRECT_EXECUTE_PATTERNS.some((pattern) => pattern.test(bodyText))) {
      add("direct_execute_without_drawer", "immediate execution should use table-detail drawer rule management entry", ref);
    }

    if (/规则任务管理 → 监控对象/.test(bodyText)) {
      add("monitor_object_as_menu_path", "monitor object is a wizard step, not a navigation menu path", ref);
    }

    if (
      OLD_RULESET_VERSIONS.has(testCase.version) &&
      !isDataStandardCheckCase &&
      OLD_RULESET_UNSUPPORTED_TERMS.some((term) => bodyText.includes(term))
    ) {
      add("pre_v648_ruleset_not_supported", "v6.4.2-v6.4.6 cases must not use rule-set management wording", ref);
    }

    const shouldUseRuleSetFlow =
      !OLD_RULESET_VERSIONS.has(testCase.version) &&
      !/菜单名称|页面菜单/.test(bodyText) &&
      !testCase.title.includes("总览") &&
      DQ_CHAIN_TERMS.some((term) => bodyText.includes(term)) &&
      (/新建监控规则|立即执行|任务运行|任务正常运行|实例详情|脏数据|校验结果|分区信息改变/.test(bodyText) ||
        testCase.title.includes("主流程"));
    if (shouldUseRuleSetFlow && (!bodyText.includes("规则集管理") || !bodyText.includes("规则包"))) {
      add("post_v648_dq_chain_missing_ruleset", "v6.4.8+ DQ task cases should include rule-set and rule-package flow", ref);
    }

    const emptyRuleDescriptionPattern = /(?:规则集描述|规则描述|备注)\s*[:：=]\s*(?:无|空|不填|留空)(?=\s|$|[，,；;。<])/i;
    const emptyRuleDescriptionLine = [
      ...testCase.preconditionLines,
      ...testCase.steps.flatMap((step) => [
        { line: step.line, text: step.step },
        { line: step.line, text: step.expected },
      ]),
    ].find((entry) => emptyRuleDescriptionPattern.test(textOnly(entry.text)))?.line;
    if (emptyRuleDescriptionPattern.test(bodyText)) {
      add("empty_rule_description", "rule description is empty or placeholder text", {
        ...ref,
        line: emptyRuleDescriptionLine ?? testCase.line,
      });
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

try {
  main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
