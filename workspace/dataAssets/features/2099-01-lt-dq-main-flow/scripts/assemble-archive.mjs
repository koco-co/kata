#!/usr/bin/env bun
// 按固定模块顺序拼接 fragments → archive.md，生成统一 frontmatter
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FA = process.argv[2];
if (!FA) {
  console.error("Usage: bun assemble-archive.mjs <feature-dir>");
  process.exit(1);
}

const fragDir = join(FA, ".process/fragments");
const ORDER = [
  "资产盘点", "元数据", "数据标准", "数据模型", "数据安全", "平台管理",
  "dq-完整性校验", "dq-有效性校验", "dq-唯一性校验", "dq-统计性校验",
  "dq-自定义SQL", "dq-一致性校验", "dq-时效性校验", "dq-合理性校验",
];

let body = "";
for (const name of ORDER) {
  const f = join(fragDir, name + ".md");
  let c = readFileSync(f, "utf8")
    .replace(/<!-- self-check:.*?-->/g, "")
    .trim();
  body += c + "\n\n";
}

const caseCount = (body.match(/^##### /gm) || []).length;
const fm = [
  "---",
  'suite_name: "岚图主流程用例集合"',
  'root_name: "数据资产岚图定制版主流程回归用例(#23)"',
  'module: "dq"',
  'prd_version: "v6.3.x"',
  'prd_id: "lt-dq-main-flow"',
  'tags:\n  - "主流程"\n  - "回归"\n  - "岚图"\n  - "定制"',
  'status: "草稿"',
  "create_at: \"2026-05-25\"",
  `case_count: ${caseCount}`,
  'origin: "case-optimization"',
  "---",
  "",
].join("\n");

writeFileSync(join(FA, "岚图主流程用例整理.md"), fm + "\n" + body);
console.log(`assembled ${caseCount} cases`);
