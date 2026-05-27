# 岚图已上线需求用例规范整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全量规范化 `2099-01-lt-dq-launched-reqs` 的 Markdown/XMind 用例，并补齐 `v6.4.2` 到 `v6.4.6` 数据质量规则任务类用例的规则集链路。

**Architecture:** 先用专用审计脚本量化 1216 条用例的结构问题，再基于 DOM、现有 Playwright 页对象、前端源码、后端源码和项目知识库建立字段/流程证据基线。随后按版本顺序修订 Markdown，重建 XMind，最后用脚本和现有 lint 命令验证数量、结构、规则集链路和 Markdown/XMind 同步。

**Tech Stack:** Bun、Node ESM scripts、kata CLI、JSZip/XMind build script、Markdown Archive、Ant Design DOM/source evidence.

**Spec:** `docs/superpowers/specs/2026-05-26-lt-dq-launched-reqs-case-cleanup-design.md`

---

## File Structure

- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`
  - Main archive. Preserve 1216 H5 cases and version organization.
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind`
  - Regenerated from Markdown by `scripts/build-delivery-xmind.mjs`.
- Create: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs`
  - Local deterministic audit for counts, Markdown structure, weak assertions, old navigation syntax, and pre-v6.4.8 DQ rule-task chain gaps.
- Read-only evidence:
  - `workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-rule-task-44-cases.md`
  - `.ai/core/skills/case-draft/references/output-standard.md`
  - `.ai/core/rules/case-qa.md`
  - `workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md`
  - `workspace/dataAssets/_shared/knowledge/modules/data-quality.md`
  - `workspace/dataAssets/_shared/pages/2099-01-lt-dq-launched-reqs/**`
  - `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/**`
  - `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/**`
  - `workspace/dataAssets/.kata/repos/dt-insight-web/dt-center-valid/**`
- Ignored evidence outputs:
  - `/private/tmp/lt-dq-launched-reqs-audit-before.json`
  - `/private/tmp/lt-dq-launched-reqs-audit-after.json`
  - `/private/tmp/lt-dq-launched-reqs-evidence.txt`

## Task 1: Add Archive Audit Script

**Files:**
- Create: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs`

- [ ] **Step 1: Add executable audit script**

Create `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs` with this exact content:

```js
#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultArchive = resolve(featureDir, "岚图已上线需求主流程用例.md");
const EXPECTED_CASE_COUNT = 1216;
const EXPECTED_VERSION_COUNTS = new Map([
  ["v6.4.10", 278],
  ["v6.4.2", 88],
  ["v6.4.3", 297],
  ["v6.4.4", 132],
  ["v6.4.5", 60],
  ["v6.4.6", 117],
  ["v6.4.8", 244],
]);
const OLD_RULESET_VERSIONS = new Set(["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6"]);
const WEAK_EXPECTED = new Set([
  "进入成功",
  "保存成功",
  "查询成功",
  "操作成功",
  "页面正常打开",
  "页面正常加载",
  "正常显示",
  "展示正常",
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { archive: defaultArchive, jsonOut: "", strict: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--archive") parsed.archive = resolve(args[++index]);
    else if (arg === "--json-out") parsed.jsonOut = resolve(args[++index]);
    else if (arg === "--strict") parsed.strict = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
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
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatterCaseCount(markdown) {
  const match = markdown.match(/\ncase_count:\s*(\d+)\s*\n/);
  return match ? Number(match[1]) : null;
}

function flushCase(cases, current) {
  if (!current) return;
  current.preconditionText = current.preconditionLines.join("\n").trim();
  current.stepText = current.stepLines.join("\n").trim();
  cases.push(current);
}

function parseCases(markdown) {
  const cases = [];
  let version = "";
  let section = "";
  let current = null;
  let sectionMode = "";
  let inFence = false;
  let fenceMarker = "";
  let stepsHeaderSeen = false;
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const versionMatch = line.match(/^##\s+(v\d+\.\d+\.\d+)\s*$/);
    if (versionMatch) {
      version = versionMatch[1];
      section = "";
      continue;
    }
    const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    const caseMatch = line.match(/^#####\s+【(P[0-3])】(.+?)\s*$/);
    if (caseMatch) {
      flushCase(cases, current);
      current = {
        line: lineNumber,
        version,
        section,
        priority: caseMatch[1],
        title: caseMatch[2].trim(),
        preconditionHeaders: 0,
        stepsHeaders: 0,
        preconditionFenceLang: null,
        preconditionLines: [],
        stepLines: [],
        stepRows: [],
      };
      sectionMode = "";
      inFence = false;
      fenceMarker = "";
      stepsHeaderSeen = false;
      continue;
    }
    if (!current) continue;

    if (/^>\s*前置条件\s*$/.test(line)) {
      current.preconditionHeaders += 1;
      sectionMode = "preconditions";
      inFence = false;
      fenceMarker = "";
      continue;
    }
    if (/^>\s*用例步骤\s*$/.test(line)) {
      current.stepsHeaders += 1;
      sectionMode = "steps";
      inFence = false;
      fenceMarker = "";
      stepsHeaderSeen = false;
      continue;
    }

    if (sectionMode === "preconditions") {
      const fence = line.match(/^(`{3,})([A-Za-z0-9_-]*)\s*$/);
      if (fence && !inFence) {
        fenceMarker = fence[1];
        current.preconditionFenceLang = fence[2] || "";
        inFence = true;
      } else if (inFence && line.trim() === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      } else if (inFence) {
        current.preconditionLines.push(line);
      }
      continue;
    }

    if (sectionMode === "steps") {
      current.stepLines.push(line);
      if (/^\|\s*编号\s*\|\s*步骤\s*\|\s*预期\s*\|/.test(line)) {
        stepsHeaderSeen = true;
        continue;
      }
      if (/^\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|/.test(line)) continue;
      if (stepsHeaderSeen && line.startsWith("|")) {
        const cells = splitMarkdownTableRow(line);
        if (cells.length >= 3) {
          current.stepRows.push({
            number: textOnly(cells[0]),
            step: cells[1].trim(),
            expected: cells[2].trim(),
          });
        }
      }
    }
  }
  flushCase(cases, current);
  return cases;
}

function classifyIssues(markdown, cases) {
  const issues = [];
  const frontmatterCaseCount = parseFrontmatterCaseCount(markdown);
  if (frontmatterCaseCount !== EXPECTED_CASE_COUNT) {
    issues.push({
      rule: "frontmatter_case_count",
      message: `frontmatter case_count ${frontmatterCaseCount} != ${EXPECTED_CASE_COUNT}`,
    });
  }
  if (cases.length !== EXPECTED_CASE_COUNT) {
    issues.push({
      rule: "case_count",
      message: `parsed H5 case count ${cases.length} != ${EXPECTED_CASE_COUNT}`,
    });
  }

  const versionCounts = new Map();
  for (const item of cases) versionCounts.set(item.version, (versionCounts.get(item.version) ?? 0) + 1);
  for (const [version, expected] of EXPECTED_VERSION_COUNTS) {
    const observed = versionCounts.get(version) ?? 0;
    if (observed !== expected) {
      issues.push({
        rule: "version_case_count",
        version,
        message: `${version} case count ${observed} != ${expected}`,
      });
    }
  }

  for (const item of cases) {
    const body = `${item.title}\n${item.section}\n${item.preconditionText}\n${item.stepText}`;
    if (item.preconditionHeaders !== 1) {
      issues.push({
        rule: "precondition_header_count",
        line: item.line,
        version: item.version,
        title: item.title,
        message: `precondition header count is ${item.preconditionHeaders}`,
      });
    }
    if (item.stepsHeaders !== 1) {
      issues.push({
        rule: "steps_header_count",
        line: item.line,
        version: item.version,
        title: item.title,
        message: `steps header count is ${item.stepsHeaders}`,
      });
    }
    if (item.preconditionFenceLang !== "sql") {
      issues.push({
        rule: "precondition_fence_language",
        line: item.line,
        version: item.version,
        title: item.title,
        message: `precondition fence language is ${JSON.stringify(item.preconditionFenceLang)}`,
      });
    }
    if (item.stepRows.length === 0) {
      issues.push({
        rule: "missing_step_rows",
        line: item.line,
        version: item.version,
        title: item.title,
        message: "case has no parsed step rows",
      });
    }
    for (const row of item.stepRows) {
      if (!/^\d+$/.test(row.number)) {
        issues.push({
          rule: "step_number",
          line: item.line,
          version: item.version,
          title: item.title,
          message: `step number is ${JSON.stringify(row.number)}`,
        });
      }
      if (/进入「[^」]+」(?:\s*[-→]\s*「[^」]+」)+/.test(row.step)) {
        issues.push({
          rule: "old_navigation_quote_style",
          line: item.line,
          version: item.version,
          title: item.title,
          message: textOnly(row.step).slice(0, 160),
        });
      }
      const expected = textOnly(row.expected);
      if (!/^1\)/.test(expected)) {
        issues.push({
          rule: "expected_numbering",
          line: item.line,
          version: item.version,
          title: item.title,
          message: expected.slice(0, 160),
        });
      }
      if (WEAK_EXPECTED.has(expected.replace(/^1\)\s*/, ""))) {
        issues.push({
          rule: "weak_expected_only",
          line: item.line,
          version: item.version,
          title: item.title,
          message: expected,
        });
      }
    }
    if (
      OLD_RULESET_VERSIONS.has(item.version) &&
      /规则任务|监控规则|校验结果|数据质量报告|规则调度|运行方式|分区信息|质量评估汇总|脏数据明细/.test(body) &&
      !/规则集管理/.test(body)
    ) {
      issues.push({
        rule: "pre_v648_dq_chain_missing_ruleset",
        line: item.line,
        version: item.version,
        title: item.title,
        message: "old DQ rule-task/report/result flow does not mention 规则集管理",
      });
    }
    if (/规则描述[：:]\s*(无|空|不填|留空)(?:<br>|\n|$)/.test(body)) {
      issues.push({
        rule: "empty_rule_description",
        line: item.line,
        version: item.version,
        title: item.title,
        message: "rule description is explicitly empty",
      });
    }
  }
  return { issues, versionCounts: Object.fromEntries(versionCounts) };
}

function summarize(issues) {
  const byRule = {};
  for (const issue of issues) byRule[issue.rule] = (byRule[issue.rule] ?? 0) + 1;
  return byRule;
}

function main() {
  const args = parseArgs();
  const markdown = readFileSync(args.archive, "utf8");
  const cases = parseCases(markdown);
  const result = {
    archive: args.archive,
    caseCount: cases.length,
    issues: [],
    issuesByRule: {},
    versionCounts: {},
  };
  const classified = classifyIssues(markdown, cases);
  result.issues = classified.issues;
  result.issuesByRule = summarize(classified.issues);
  result.versionCounts = classified.versionCounts;

  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (args.jsonOut) writeFileSync(args.jsonOut, json);
  console.log(
    JSON.stringify(
      {
        archive: result.archive,
        caseCount: result.caseCount,
        issueCount: result.issues.length,
        issuesByRule: result.issuesByRule,
        versionCounts: result.versionCounts,
        jsonOut: args.jsonOut || null,
      },
      null,
      2,
    ),
  );
  if (args.strict && result.issues.length > 0) process.exit(1);
}

main();
```

- [ ] **Step 2: Run audit script against the current archive**

Run:
```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs --json-out /private/tmp/lt-dq-launched-reqs-audit-before.json
```

Expected: command exits 0 and prints `caseCount: 1216`. The `issueCount` is expected to be greater than 0 before cleanup.

- [ ] **Step 3: Commit the audit script**

Run:
```bash
git add workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs
git commit -m "test: 🧪 add launched reqs case audit"
```

Expected: commit succeeds with one new tracked script.

## Task 2: Build Evidence Baseline

**Files:**
- Read: `workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md`
- Read: `workspace/dataAssets/_shared/knowledge/modules/data-quality.md`
- Read: `workspace/dataAssets/_shared/pages/2099-01-lt-dq-launched-reqs/base/data-assets-shell-page.ts`
- Read: `workspace/dataAssets/_shared/pages/2099-01-lt-dq-launched-reqs/quality/quality-page.ts`
- Read: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/navData/validNavData.ts`
- Read: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/routers.tsx`
- Read: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/api/ruleConfig.ts`
- Read: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/dao/src/main/resources/mapper/valid/monitorRulePackageRecord-mapper.xml`
- Optional read: `workspace/dataAssets/.kata/repos/dt-insight-web/dt-center-valid/**`
- Create ignored: `/private/tmp/lt-dq-launched-reqs-evidence.txt`

- [ ] **Step 1: Capture route and menu evidence**

Run:
```bash
{
  rg -n "ruleSet|taskQuery|qualityReport|/dq/rule|规则集管理|规则任务管理|校验结果查询|数据质量报告" workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/navData/validNavData.ts
  rg -n "RuleSet|TaskQuery|QualityReport|path: \"ruleSet\"|path: \"taskQuery\"|path: \"qualityReport\"" workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/routers.tsx
  rg -n "规则集管理|规则任务管理|校验结果查询|数据质量报告|导入规则包|新建监控规则|新建规则集" workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md workspace/dataAssets/_shared/pages/2099-01-lt-dq-launched-reqs
} > /private/tmp/lt-dq-launched-reqs-evidence.txt
```

Expected: `/private/tmp/lt-dq-launched-reqs-evidence.txt` contains references for `#/dq/ruleSet`, `#/dq/rule`, `#/dq/taskQuery`, and `#/dq/qualityReport`.

- [ ] **Step 2: Capture rule package and rule description evidence**

Run:
```bash
{
  rg -n "规则集|规则包|规则描述|导入规则包|description|rule package|package" workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/views/valid/ruleSet workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/views/valid/ruleConfig workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/api/ruleConfig.ts
  rg -n "description|package_id|assets_dq_monitor_rule_package_record|monitor_type|rule_strength|filter_config_type" workspace/dataAssets/.kata/repos/customltem/dt-center-assets/dao/src/main/resources/mapper/valid/monitorRulePackageRecord-mapper.xml
} >> /private/tmp/lt-dq-launched-reqs-evidence.txt
```

Expected: output includes front-end labels or API fields for rule package import/configuration, and backend persistence fields including `description`.

- [ ] **Step 3: Capture project business chain evidence**

Run:
```bash
sed -n '1,180p' workspace/dataAssets/_shared/knowledge/modules/data-quality.md >> /private/tmp/lt-dq-launched-reqs-evidence.txt
```

Expected: evidence file includes the business chain `规则库配置 → 规则集管理 → 规则任务管理 → 校验结果查询 → 数据质量报告`.

- [ ] **Step 4: Check for unresolved evidence gaps**

Run:
```bash
rg -n "规则集管理|导入规则包|规则描述|立即执行|校验结果查询|数据质量报告" /private/tmp/lt-dq-launched-reqs-evidence.txt
```

Expected: command exits 0. If any of these terms is absent, ask the user before editing cases that depend on that missing term.

## Task 3: Normalize Global Markdown Structure

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`
- Read: `/private/tmp/lt-dq-launched-reqs-audit-before.json`

- [ ] **Step 1: Convert precondition fences to SQL fences**

Edit every case precondition block in `岚图已上线需求主流程用例.md` so that `> 前置条件` is immediately followed by a fenced code block starting with:

```markdown
```sql
```

For preconditions that are explanatory text rather than executable SQL, wrap the explanation in a SQL comment block:

```sql
/*
1. 已登录系统并具备当前用例所需菜单权限。
2. 已准备本用例所需的页面数据或历史任务数据。
*/
```

Expected: no case has a bare ` ``` ` precondition fence after this step.

- [ ] **Step 2: Normalize navigation and UI quotes in step cells**

Apply these exact style rules inside the steps table:

```text
进入「数据质量」-「规则任务管理」 -> 进入【数据质量 → 规则任务管理】
进入「数据质量-数据质量报告」 -> 进入【数据质量 → 数据质量报告】
进入「数据质量-数据质量报告-新增报告」 -> 进入【数据质量 → 数据质量报告】, 点击「新增报告」
点击【查询】按钮 -> 点击「查询」按钮
点击【重置】按钮 -> 点击「重置」按钮
```

Expected: the audit script no longer reports `old_navigation_quote_style` for edited rows.

- [ ] **Step 3: Normalize expected assertions**

For each expected cell that contains a single unnumbered assertion, rewrite it to start with `1)`. For expected cells containing multiple assertions separated by semicolons or commas, split them with `<br>` and number each assertion:

```markdown
1)数据质量报告页面正常加载<br>2)查询区展示「报告名称」「数据表」「生成时间」筛选项<br>3)列表展示「报告名称」「数据表」「生成时间」「操作」列
```

Replace weak single assertions using these exact expansions:

```text
进入成功 -> 1)页面路由进入目标菜单<br>2)页面标题或列表主区域可见
保存成功 -> 1)页面提示保存成功<br>2)列表或详情页回显本次保存的数据
查询成功 -> 1)查询请求完成且列表刷新<br>2)查询条件保留在页面上
操作成功 -> 1)页面提示操作成功<br>2)目标记录状态或列表内容按本次操作更新
```

Expected: no edited expected cell uses `进入成功` or `页面正常打开` as its only assertion.

- [ ] **Step 4: Run non-strict audit after global formatting**

Run:
```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs --json-out /private/tmp/lt-dq-launched-reqs-audit-global.json
```

Expected: command exits 0, `caseCount` remains 1216, and `versionCounts` remains `{"v6.4.10":278,"v6.4.2":88,"v6.4.3":297,"v6.4.4":132,"v6.4.5":60,"v6.4.6":117,"v6.4.8":244}`.

## Task 4: Repair Pre-v6.4.8 Data Quality Rule-Task Chains

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`
- Read: `/private/tmp/lt-dq-launched-reqs-audit-global.json`
- Read: `/private/tmp/lt-dq-launched-reqs-evidence.txt`

- [ ] **Step 1: Locate pre-v6.4.8 chain gaps**

Run:
```bash
node -e 'const r=require("/private/tmp/lt-dq-launched-reqs-audit-global.json"); for (const i of r.issues.filter(x=>x.rule==="pre_v648_dq_chain_missing_ruleset")) console.log(`${i.version}:${i.line}:${i.title}`)'
```

Expected: prints the exact line numbers for old-version data quality cases that still lack `规则集管理`.

- [ ] **Step 2: Add canonical precondition chain sentence**

For every case printed in Step 1, add this exact sentence inside the precondition SQL comment block when the case depends on an existing rule task, result, report, dirty detail, or execution record:

```text
业务链路要求：与本用例相关的规则任务需先在【数据质量 → 规则集管理】按数据表创建规则集和规则包，再在【数据质量 → 规则任务管理】通过「导入规则包」引用生成；前置中提到的已存在规则任务均指该链路下已保存且可执行的规则任务。
```

Expected: old-version precondition text no longer implies a rule task can exist without a ruleset source.

- [ ] **Step 3: Replace direct rule-task creation steps with ruleset import flow**

For old-version cases that create a rule task in the steps, replace the direct rule configuration sequence with this canonical flow, adapting only the table name, rule name, rule type, field, statistic function, expected value, and partition values from the original case:

```markdown
| 1 | 进入【数据质量 → 规则集管理】, 点击「新建规则集」:<br>- 选择数据源: ${DATASOURCE}<br>- 选择数据库: ${DATABASE}<br>- 选择数据表: ${TABLE}<br>- 规则集描述: ${RULE_NAME}规则集<br>- 新增规则包名称: ${RULE_NAME}规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包创建成功 |
| 2 | 选择规则包「${RULE_NAME}规则包」, 新增「${RULE_TYPE}」规则:<br>- 生效范围: ${SCOPE}<br>- 字段: ${FIELD}<br>- 统计函数: ${FUNCTION}<br>- 过滤条件: ${FILTER}<br>- 校验方法: ${CHECK_METHOD}<br>- 期望值: ${EXPECTED_VALUE}<br>- 强弱规则: ${RULE_STRENGTH}<br>- 规则描述: ${RULE_DESCRIPTION}<br>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示「${RULE_TYPE}」规则<br>3)规则配置项保存后回显正确<br>4)规则描述展示为「${RULE_DESCRIPTION}」 |
| 3 | 进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:<br>- 规则名称: ${TASK_NAME}<br>- 选择数据源: ${DATASOURCE}<br>- 选择数据库: ${DATABASE}<br>- 选择数据表: ${TABLE}<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入监控规则页面 |
| 4 | 在「监控规则」中点击「导入规则包」:<br>- 规则集: ${RULE_NAME}规则集<br>- 规则包: ${RULE_NAME}规则包<br>确认导入后点击「下一步」 | 1)规则包导入成功<br>2)页面展示导入的「${RULE_TYPE}」规则<br>3)规则参数与规则集配置一致 |
| 5 | 在「调度属性」中配置:<br>- 调度周期: ${SCHEDULE}<br>- 实例生成方式: ${INSTANCE_MODE}<br>- 超时时间: ${TIMEOUT}<br>- 告警配置: ${ALARM}<br>- 报告配置: ${REPORT}<br>点击「保存」 | 1)调度属性配置成功<br>2)规则任务保存成功 |
```

Use the original case values to replace `${...}` tokens in the archive. Do not leave `${RULE_NAME}`, `${TABLE}`, or any template token in the final Markdown except existing environment variables such as `${DATASOURCE}`, `${DATABASE}`, `${TABLE}`, and `${SchemaA}`.

- [ ] **Step 4: Keep failure generation outside ruleset edits**

For old-version positive/negative comparison cases, ensure the later failure step changes only task partition, input data, task object, or execution condition. Use this pattern when the case compares partitions:

```markdown
| 7 | 进入【数据质量 → 规则任务管理】, 编辑规则任务「${TASK_NAME}」, 仅变更选择分区:<br>- 选择已有分区: ${PASS_PARTITION} -> ${FAIL_PARTITION}<br>保存后再次点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
```

Expected: no edited failure case changes ruleset expected values to manufacture failure.

- [ ] **Step 5: Run audit for pre-v6.4.8 chain gaps**

Run:
```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs --json-out /private/tmp/lt-dq-launched-reqs-audit-chain.json
node -e 'const r=require("/private/tmp/lt-dq-launched-reqs-audit-chain.json"); const xs=r.issues.filter(x=>x.rule==="pre_v648_dq_chain_missing_ruleset"); console.log(xs.length); if (xs.length) process.exit(1)'
```

Expected: second command prints `0` and exits 0.

## Task 5: Finalize v6.4.8 and v6.4.10 Formatting

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`

- [ ] **Step 1: Scan new-version rule-task cases for inconsistent import wording**

Run:
```bash
rg -n "导入规则包|选择已有规则集|新增规则集|规则集管理|规则任务管理|规则描述" workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md
```

Expected: output shows `v6.4.8` and `v6.4.10` cases using consistent `规则集管理` and `导入规则包` wording.

- [ ] **Step 2: Repair empty rule descriptions**

Run:
```bash
node -e 'const r=require("/private/tmp/lt-dq-launched-reqs-audit-chain.json"); for (const i of r.issues.filter(x=>x.rule==="empty_rule_description")) console.log(`${i.version}:${i.line}:${i.title}`)'
```

For each printed case, replace `规则描述: 无` or equivalent with a business sentence matching the rule purpose, using this style:

```text
规则描述: 校验${FIELD_OR_OBJECT}${FUNCTION_OR_SCENE}结果
```

Example final text:

```text
规则描述: 校验 car_model_name 空值数分区结果
```

Expected: no case explicitly leaves rule description empty.

- [ ] **Step 3: Run strict audit candidate**

Run:
```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs --json-out /private/tmp/lt-dq-launched-reqs-audit-after.json --strict
```

Expected: exits 0. If it exits 1, fix every remaining issue listed in `/private/tmp/lt-dq-launched-reqs-audit-after.json` and rerun this command.

## Task 6: Regenerate and Validate XMind

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind`
- Read: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/build-delivery-xmind.mjs`

- [ ] **Step 1: Rebuild XMind from Markdown**

Run:
```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/build-delivery-xmind.mjs
```

Expected: exits 0 and prints JSON containing `"caseTopics": 1216`, `"markers": 1216`, and `versionOrder` equal to `["v6.4.2","v6.4.3","v6.4.4","v6.4.5","v6.4.6","v6.4.8","v6.4.10"]`.

- [ ] **Step 2: Run feature-scoped case lint**

Run:
```bash
bun engine/bin/kata cases lint --exit-code --severity fail-only --scope workspace/dataAssets/features/2099-01-lt-dq-launched-reqs
```

Expected: exits 0 and prints `[cases lint] violations=0` or only non-fail warnings.

- [ ] **Step 3: Run repository diff checks**

Run:
```bash
git diff --check
```

Expected: exits 0 with no whitespace errors.

## Task 7: Review Diff and Commit

**Files:**
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`
- Modify: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind`
- Create: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs`

- [ ] **Step 1: Inspect tracked diff summary**

Run:
```bash
git status --short
git diff --stat
```

Expected: tracked changes are limited to the archive Markdown, XMind, and audit script.

- [ ] **Step 2: Inspect representative Markdown diff**

Run:
```bash
git diff -- workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md | sed -n '1,260p'
```

Expected: diff shows format normalization, numbered expected assertions, and pre-v6.4.8 ruleset chain additions without unrelated feature rewrites.

- [ ] **Step 3: Stage final artifacts**

Run:
```bash
git add workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md \
  workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind \
  workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs
```

Expected: staging succeeds.

- [ ] **Step 4: Commit final artifacts**

Run:
```bash
git commit -m "docs: 🧹 normalize lt dq launched reqs cases"
```

Expected: commit succeeds.

## Task 8: Final Verification Summary

**Files:**
- Read: `/private/tmp/lt-dq-launched-reqs-audit-after.json`
- Read: final command output from XMind build and cases lint

- [ ] **Step 1: Capture final audit summary**

Run:
```bash
node -e 'const r=require("/private/tmp/lt-dq-launched-reqs-audit-after.json"); console.log(JSON.stringify({caseCount:r.caseCount, issueCount:r.issues.length, versionCounts:r.versionCounts, issuesByRule:r.issuesByRule}, null, 2))'
```

Expected: `caseCount` is 1216 and `issueCount` is 0.

- [ ] **Step 2: Prepare final response evidence**

Include these exact evidence items in the final response:

```text
Audit: bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs --json-out /private/tmp/lt-dq-launched-reqs-audit-after.json --strict
Audit exit code: 0
Audit counts: 1216 cases; v6.4.10=278, v6.4.2=88, v6.4.3=297, v6.4.4=132, v6.4.5=60, v6.4.6=117, v6.4.8=244
XMind build: bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/build-delivery-xmind.mjs
XMind build exit code: 0
Case lint: bun engine/bin/kata cases lint --exit-code --severity fail-only --scope workspace/dataAssets/features/2099-01-lt-dq-launched-reqs
Case lint exit code: 0
Artifacts: workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md; workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind
Scope note: these commands verify static structure and Markdown/XMind consistency, not live platform execution.
```

Expected: final response does not claim all cases executed on the platform.
