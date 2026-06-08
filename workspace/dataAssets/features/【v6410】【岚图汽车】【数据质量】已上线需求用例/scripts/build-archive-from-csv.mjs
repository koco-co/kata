#!/usr/bin/env bun
// 以 ltqc CSV（禅道导出）为准，重新生成岚图已上线需求用例 archive md。
// 需求范围 = 现有 xmind 的需求节点（已确认正常），按版本→需求名→用例 3 层组织。
// 前置/步骤/预期取 CSV 原文清洗；步骤·预期只按行首 \d+. 切顶层，不按 \d+) 切（修复预期错拆）。

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const csvDir = resolve(featureDir, "../../_shared/archive/history/ltqc");
const outPath = resolve(featureDir, "岚图已上线需求用例.md");

// 版本（升序）→ CSV 文件名。v6.4.7 / v6.4.9 整版不在岚图范围。
const VERSION_FILES = [
  ["v6.4.2", "v642"],
  ["v6.4.3", "v643"],
  ["v6.4.4", "v644"],
  ["v6.4.5", "v645"],
  ["v6.4.6", "v646"],
  ["v6.4.8", "v648"],
  ["v6.4.10", "v6410"],
];

// 岚图需求选择白名单（由现有 xmind 需求节点反推、按 CSV #id 锁定）。
// 选择规则：相关需求#id ∈ 白名单；相关需求为空时用所属模块#id ∈ 白名单。
const SELECT_IDS = {
  "v6.4.2": new Set([14681, 14682, 14678, 14683, 14684, 14685]),
  "v6.4.3": new Set([9339, 14811, 14817, 14816, 14813, 14812, 14815, 14814]),
  "v6.4.4": new Set([15027, 15026, 15025]),
  "v6.4.5": new Set([9698, 9697, 9696, 9695, 9694, 9693, 9692, 9691]),
  "v6.4.6": new Set([15127, 9784]),
  "v6.4.8": new Set([15533, 15520, 10205, 15526, 15527, 15522, 15524, 15531, 15532, 10189, 10188]),
  "v6.4.10": new Set([15700, 15698, 10458, 10459, 10460, 10461, 15699, 15530, 15697, 15529, 15525]),
};

// 逐版本期望用例数（CSV 全量计数，用于自校验）。
const EXPECTED_VERSION_COUNTS = {
  "v6.4.2": 91,
  "v6.4.3": 291,
  "v6.4.4": 133,
  "v6.4.5": 60,
  "v6.4.6": 119,
  "v6.4.8": 244,
  "v6.4.10": 279,
};

// 特例：CSV 把「完整性校验」误写成「准确性校验规则(#14682)」，以「完整性校验」为准。
const NAME_ALIASES = [
  {
    version: "v6.4.2",
    matchRaw: /准确性校验规则/,
    display: "【数据质量】内置规则丰富-完整性校验",
  },
];

// ─── CSV 解析（带引号/转义/多行字段状态机）───
function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuote = false;
      } else field += c;
    } else if (c === '"') inQuote = true;
    else if (c === ",") {
      cur.push(field);
      field = "";
    } else if (c === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
    } else if (c === "\r") {
      // 行级 \r\n 的 \r 丢弃；字段内 \r\n 在带引号分支里保留
    } else field += c;
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

// ─── 文本清洗：HTML 实体 + 换行 + 智能引号 ───
function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// 剥离禅道富文本里的表现性 HTML 标签，让 md 可读、并与交付 xmind 的 stripHtml 口径一致。
// 先解码实体（把 &lt;span&gt; 这类也还原成 <span>），再按字面标签剥；块级/换行标签与行内 span/font 都转换行后归并。
function clean(text) {
  return decodeEntities(text)
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:p|span|div|font)[^>]*>/gi, "\n")
    .replace(/[“”„‟]/g, '"')
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── 需求名提取 ───
function stripReqId(name) {
  return String(name ?? "")
    .replace(/\s*[（(]#\d+[)）]\s*$/, "")
    .trim();
}

// 取最后一个「顶层」路径段：括号内的 / 不算分隔符（保护「(sparkThrift/hive数据源)」这类名字）。
function lastTopLevelSegment(path) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < path.length; i += 1) {
    const c = path[i];
    if (c === "(" || c === "（") depth += 1;
    else if (c === ")" || c === "）") depth = Math.max(0, depth - 1);
    else if (c === "/" && depth === 0) cut = i;
  }
  return cut >= 0 ? path.slice(cut + 1) : path;
}

function requirementName(relatedReq, moduleField) {
  const rel = clean(relatedReq).trim();
  if (rel) return stripReqId(rel);
  // 所属模块 = /版本迭代测试用例/vX/[岚图/]<需求名(可含/)>(#id)
  const mod = stripReqId(clean(moduleField).trim());
  return lastTopLevelSegment(mod).trim();
}

// ─── 取行的相关需求 / 所属模块 #id ───
function relatedId(row, ix) {
  const m = String(row[ix["相关需求"]] ?? "").match(/#(\d+)/);
  return m ? Number(m[1]) : null;
}
function moduleId(row, ix) {
  const m = String(row[ix["所属模块"]] ?? "").match(/#(\d+)/);
  return m ? Number(m[1]) : null;
}

// ─── 步骤·预期：只按行首 \d+. 切顶层；\d+) 是段内子项，不切 ───
function splitNumbered(text) {
  const normalized = clean(text).trim();
  if (!normalized) return [];
  const re = /(?:^|\n)\s*(\d+)[.．、]\s*/g;
  const marks = [];
  let m;
  while ((m = re.exec(normalized)) !== null) {
    marks.push({ num: Number(m[1]), start: m.index + m[0].length, markStart: m.index });
  }
  if (marks.length === 0) return [{ num: 1, text: normalized }];
  const segs = [];
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].markStart : normalized.length;
    segs.push({ num: marks[i].num, text: normalized.slice(marks[i].start, end).trim() });
  }
  return segs;
}

function pairSteps(stepText, expectedText) {
  const steps = splitNumbered(stepText);
  const expects = splitNumbered(expectedText);
  const expByNum = new Map(expects.map((e) => [e.num, e.text]));
  const stepByNum = new Map(steps.map((s) => [s.num, s.text]));
  const nums = [...new Set([...steps.map((s) => s.num), ...expects.map((e) => e.num)])].sort(
    (a, b) => a - b,
  );
  const rows = nums.map((num) => ({
    num,
    step: stepByNum.get(num) ?? "",
    expected: expByNum.get(num) ?? "",
  }));
  const mismatch = steps.length !== expects.length;
  return { rows, mismatch };
}

// ─── md 渲染 ───
function cellText(text) {
  return clean(text).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "<br>").trim();
}

function isSql(text) {
  return /\b(SELECT|INSERT|CREATE|DROP|UPDATE|DELETE|ALTER|TRUNCATE|USE|WITH)\b/i.test(text);
}

function preconditionBlock(text) {
  const body = clean(text).trim();
  if (!body) return "```text\n无\n```";
  const lang = isSql(body) ? "sql" : "text";
  return "```" + lang + "\n" + body + "\n```";
}

const PRIORITY_PREFIX = { 1: "P0", 2: "P1", 3: "P2", 4: "P3" };

function main() {
  const sections = [];
  const report = [];
  const issues = [];
  let total = 0;
  let mismatchCount = 0;

  for (const [version, file] of VERSION_FILES) {
    const rows = parseCSV(readFileSync(resolve(csvDir, `${file}.csv`), "utf8"));
    const header = rows[0];
    const ix = Object.fromEntries(header.map((h, i) => [h, i]));
    const whitelist = SELECT_IDS[version] ?? new Set();

    // 选择行：相关需求#id ∈ 白名单；相关需求为空时用所属模块#id ∈ 白名单。
    // 选中行按「需求名」分组（保留 CSV 行序）；同一相关需求的多个所属模块子组自动合并成整条需求。
    const groups = new Map();
    const order = [];
    for (let i = 1; i < rows.length; i += 1) {
      const r = rows[i];
      if (!r[ix["用例标题"]]) continue;
      const relId = relatedId(r, ix);
      const modId = moduleId(r, ix);
      const selectedById = relId != null ? whitelist.has(relId) : modId != null && whitelist.has(modId);
      if (!selectedById) continue;
      let name = requirementName(r[ix["相关需求"]], r[ix["所属模块"]]);
      const alias = NAME_ALIASES.find((a) => a.version === version && a.matchRaw.test(name));
      if (alias) name = alias.display;
      if (!groups.has(name)) {
        groups.set(name, []);
        order.push(name);
      }
      groups.get(name).push(r);
    }
    const selected = order.map((name) => ({ display: name, rows: groups.get(name) }));

    const lines = [`## ${version}`, ""];
    let verCount = 0;
    for (const grp of selected) {
      lines.push(`### ${grp.display}`, "");
      for (const r of grp.rows) {
        const title = clean(r[ix["用例标题"]]).trim();
        const prio = PRIORITY_PREFIX[Number(r[ix["优先级"]])] ?? "P2";
        const { rows: stepRows, mismatch } = pairSteps(r[ix["步骤"]], r[ix["预期"]]);
        if (mismatch) mismatchCount += 1;
        lines.push(`##### 【${prio}】${title}`, "");
        lines.push("> 前置条件", "");
        lines.push(preconditionBlock(r[ix["前置条件"]]), "");
        lines.push("> 用例步骤", "");
        lines.push("| 编号 | 步骤 | 预期 |", "| --- | --- | --- |");
        stepRows.forEach((sr, idx) => {
          lines.push(`| ${idx + 1} | ${cellText(sr.step)} | ${cellText(sr.expected)} |`);
        });
        lines.push("");
        verCount += 1;
        total += 1;
      }
    }
    sections.push(lines.join("\n"));
    report.push({ version, selected: selected.length, cases: verCount });
    const expected = EXPECTED_VERSION_COUNTS[version];
    if (expected != null && verCount !== expected) {
      issues.push(`${version}: 用例数 ${verCount} != 期望 ${expected}`);
    }
  }

  const frontmatter = [
    "---",
    'suite_name: "岚图已上线需求用例"',
    'description: "以 ltqc CSV 为准重新生成的岚图已上线需求用例（版本→需求→用例）"',
    "tags:",
    '  - "已上线需求"',
    '  - "岚图"',
    '  - "数据质量"',
    'create_at: "2026-05-20"',
    'status: "草稿"',
    `case_count: ${total}`,
    "---",
    "",
  ].join("\n");

  writeFileSync(outPath, `${frontmatter}\n${sections.join("\n")}\n`);

  console.log(JSON.stringify({ output: outPath, total, mismatchCount, report, issues }, null, 2));
  if (issues.length) {
    console.error(`生成校验失败：\n  - ${issues.join("\n  - ")}`);
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
