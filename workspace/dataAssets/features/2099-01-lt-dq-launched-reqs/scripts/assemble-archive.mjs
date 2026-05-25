#!/usr/bin/env bun
// 按版本顺序拼接 track-B fragments → archive.md
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FB = process.argv[2];
if (!FB) {
  console.error("Usage: bun assemble-archive.mjs <feature-dir>");
  process.exit(1);
}

const fragDir = join(FB, ".process/fragments-launched");
const ORDER = ["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6", "v6.4.8", "v6.4.10"];

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
  'suite_name: "岚图已上线需求主流程用例"',
  'root_name: "数据资产岚图定制版已上线需求主流程回归用例(#23)"',
  'module: "dq"',
  'prd_version: "v6.4.x"',
  'prd_id: "lt-dq-launched-reqs"',
  'tags:\n  - "主流程"\n  - "回归"\n  - "岚图"\n  - "已上线需求"',
  'status: "草稿"',
  "create_at: \"2026-05-25\"",
  `case_count: ${caseCount}`,
  'origin: "case-optimization"',
  "---",
  "",
].join("\n");

writeFileSync(join(FB, "岚图已上线需求主流程用例.md"), fm + "\n" + body);
console.log(`assembled ${caseCount} cases`);
